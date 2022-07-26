// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Platform,
  Result,
} from "@microsoft/teamsfx-api";
import { cloneDeep } from "lodash";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { hasApi } from "../../common/projectSettingsHelperV3";
import { convertToAlphanumericOnly } from "../../common/utils";
import { BicepComponent } from "../bicep";
import "../connection/azureWebAppConfig";
import { ComponentNames } from "../constants";
import { AzureSqlResource } from "../resource/azureSql";
import { UtilFunctions } from "../resource/azureSql/actions/configure";
import "../resource/identity";
import { generateConfigBiceps, persistBiceps } from "../utils";
import { getComponent, runActionByName } from "../workflow";

@Service("sql")
export class Sql {
  name = "sql";

  /**
   * 1. config sql
   * 2. add sql provision bicep
   * 3. re-generate resources that connect to sql
   * 4. persist bicep
   */
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      type: "function",
      name: "sql.add",
      question: (context, inputs) => {
        if (inputs.platform == Platform.CLI_HELP) {
          return ok(UtilFunctions.buildQuestionNode());
        }
        return ok(undefined);
      },
      execute: async (context, inputs) => {
        const sqlComponent = getComponent(context.projectSetting, ComponentNames.AzureSQL);
        const hasFunc = hasApi(context.projectSetting);
        if (!hasFunc) {
          const res = await runActionByName("teams-api.add", context, inputs);
          if (res.isErr()) return err(res.error);
        }
        if (sqlComponent) return ok([]);
        const projectSettings = context.projectSetting;
        const remarks: string[] = ["config 'azure-sql' in projectSettings"];
        projectSettings.components.push({
          name: "azure-sql",
          provision: true,
        });

        // generate bicep
        // bicep.init
        {
          const bicepComponent = Container.get<BicepComponent>("bicep");
          const res = await bicepComponent.init(inputs.projectPath);
          if (res.isErr()) return err(res.error);
        }

        // sql bicep
        {
          const provisionType = sqlComponent ? "database" : "server";
          const clonedInputs = cloneDeep(inputs);
          clonedInputs.provisionType = provisionType;
          const sqlResource = Container.get<AzureSqlResource>(ComponentNames.AzureSQL);
          const res = await sqlResource.generateBicep(context, clonedInputs);
          if (res.isErr()) return err(res.error);
          const bicepRes = await persistBiceps(
            inputs.projectPath,
            convertToAlphanumericOnly(context.projectSetting.appName),
            res.value
          );
          if (bicepRes.isErr()) return bicepRes;
          remarks.push("generate sql bicep");
        }

        // generate config bicep
        {
          const res = await generateConfigBiceps(context, inputs);
          if (res.isErr()) return err(res.error);
          remarks.push("generate config biceps");
        }

        return ok(remarks);
      },
    };
    return ok(action);
  }
}
