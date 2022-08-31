// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  ContextV3,
  InputsWithProjectPath,
  ok,
  ResourceContextV3,
  v3,
  Result,
  FxError,
  Effect,
} from "@microsoft/teamsfx-api";
import Container from "typedi";
import { ComponentNames, TelemetryConstants } from "../../../constants";
import { ActionLogger, LoggerMW } from "../../../middleware/logger";
import { ProgressBarMW } from "../../../middleware/progressbar";
import { ActionErrorHandler, RunWithCatchErrorMW } from "../../../middleware/runWithCatchError";
import { ActionTelemetryImplement, TelemetryMW } from "../../../middleware/telemetry";
import { ActionContext } from "../../../middleware/types";
import { ManagementClient } from "../clients/management";
import { SqlClient } from "../clients/sql";
import { loadDatabases, LoadManagementConfig, LoadSqlConfig } from "../config";
import { HelpLinks, Telemetry, Message } from "../constants";
import { ErrorMessage } from "../errors";
import { UserType } from "../utils/common";
import { UtilFunctions } from "./utils";
export class ConfigureActionImplement {
  static readonly source = "SQL";
  static readonly stage = "post-provision";
  static readonly telemetryComponentName = "fx-resource-azure-sql";
  static readonly progressTitle = "Configuring SQL";
  static readonly progressMessage = {
    addAadmin: "Configure aad admin for SQL",
    addUser: "Configure database user",
  };
  static readonly loggerPrefix = "[SQL Component]";
  static readonly logFormatter = (message: string) =>
    `${ConfigureActionImplement.loggerPrefix} ${message}`;

  @hooks([
    TelemetryMW(
      ActionTelemetryImplement.bind(
        null,
        ConfigureActionImplement.stage,
        ConfigureActionImplement.telemetryComponentName
      )
    ),
    RunWithCatchErrorMW(ConfigureActionImplement.source, ActionErrorHandler),
    ProgressBarMW(
      ConfigureActionImplement.progressTitle,
      Object.keys(ConfigureActionImplement.progressMessage).length
    ),
    LoggerMW(ActionLogger.bind(null, ConfigureActionImplement.logFormatter)),
  ])
  static async execute(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Effect[], FxError>> {
    const ctx = context as ResourceContextV3;
    const actionContext = context as ActionContext;
    const solutionConfig = ctx.envInfo.state.solution as v3.AzureSolutionConfig;
    const state = ctx.envInfo.state[ComponentNames.AzureSQL];
    const sqlMgrConfig = LoadManagementConfig(state);
    const sqlMgrClient = await ManagementClient.create(
      ctx.tokenProvider.azureAccountProvider,
      sqlMgrConfig
    );

    actionContext.logger?.info(Message.addFirewall);
    await sqlMgrClient.addLocalFirewallRule();

    const adminInfo = await UtilFunctions.parseLoginToken(ctx.tokenProvider.azureAccountProvider);
    await actionContext.progressBar?.next(ConfigureActionImplement.progressMessage.addAadmin);
    const existAdmin = await UtilFunctions.CheckAndSetAadAdmin(
      sqlMgrClient,
      adminInfo.name,
      adminInfo.objectId,
      solutionConfig.tenantId
    );
    if (existAdmin) {
      actionContext.logger?.info(Message.skipAddAadAdmin);
    } else {
      actionContext.logger?.info(Message.addSqlAadAdmin);
    }

    // update outputKeys
    const databases = loadDatabases(state);
    const resource = Container.get(ComponentNames.AzureSQL) as any;
    resource.finalOutputKeys.push(...Object.keys(databases));

    const identity = UtilFunctions.getIdentity(ctx);
    const sqlConfig = LoadSqlConfig(state, identity);
    const skipAddingUser = await UtilFunctions.getSkipAddingUser(
      ctx.envInfo.config,
      ctx.tokenProvider.azureAccountProvider
    );
    actionContext.telemetry?.addProperty(
      Telemetry.properties.skipAddingUser,
      skipAddingUser ? TelemetryConstants.values.yes : TelemetryConstants.values.no
    );
    actionContext.telemetry?.addProperty(
      Telemetry.properties.dbCount,
      sqlConfig.databases.length.toString()
    );

    if (!skipAddingUser) {
      if (adminInfo.userType === UserType.User) {
        await actionContext.progressBar?.next(ConfigureActionImplement.progressMessage.addUser);
        const sqlClient = await SqlClient.create(ctx.tokenProvider.azureAccountProvider, sqlConfig);
        actionContext.logger?.info(Message.addDatabaseUser(identity));
        await UtilFunctions.addDatabaseUser(ctx.logProvider, sqlClient, sqlMgrClient);
      } else {
        const message = ErrorMessage.ServicePrincipalWarning(
          identity,
          sqlConfig.databases.join(",")
        );
        actionContext.logger?.warning(
          `${message}. You can follow ${HelpLinks.default} to add database user ${identity}`
        );
      }
    } else {
      actionContext.logger?.warning(
        `Skip adding database user. You can follow ${HelpLinks.default} to add database user ${identity}`
      );
    }
    await sqlMgrClient.deleteLocalFirewallRule();
    return ok([{ type: "service", name: "azure", remarks: "configure azure-sql" }]);
  }
}
