// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  AzureSolutionSettings,
  FxError,
  Inputs,
  ok,
  Platform,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import { Service } from "typedi";
import { Bicep } from "../../../../common/constants";
import {
  AzureScopes,
  generateBicepFromFile,
  getResourceGroupNameFromResourceId,
  getSubscriptionIdFromResourceId,
  getUuid,
} from "../../../../common/tools";
import { getTemplatesFolder } from "../../../../folder";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { AzureSqlBicep, AzureSqlBicepFile, Constants, HelpLinks, Telemetry } from "../constants";
import fs from "fs-extra";
import { adminNameQuestion, adminPasswordQuestion, confirmPasswordQuestion } from "../questions";
import { SqlResultFactory } from "../results";
import { ErrorMessage } from "../errors";
import { SqlConfig } from "../config";
import { Message } from "../utils/message";
import { ConfigureMessage, DialogUtils, ProgressTitle } from "../utils/dialogUtils";
import { parseToken, UserType } from "../utils/commonUtils";
import { SqlClient } from "../sqlClient";
import { CommonErrorHandlerMW } from "../../../../core/middleware/CommonErrorHandlerMW";
import { hooks } from "@feathersjs/hooks";
import { AzureResourceSQL } from "../../../solution/fx-solution/question";
import { ManagementClient, SqlMgrClient } from "../managementClient";
import { ensureSolutionSettings } from "../../../solution/fx-solution/utils/solutionSettingsHelper";

@Service(BuiltInFeaturePluginNames.sql)
export class SqlPluginV3 implements v3.PluginV3 {
  name = BuiltInFeaturePluginNames.sql;
  displayName = "Azure SQL Database";
  totalFirewallRuleCount = 0;
  config: SqlConfig = new SqlConfig();

  async generateBicep(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.AddFeatureInputs
  ): Promise<Result<v3.BicepTemplate[], FxError>> {
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const firstTime = !solutionSettings.activeResourcePlugins.includes(this.name);
    const armRes = firstTime
      ? await this.generateNewSqlServerBicep(ctx, inputs)
      : await this.generateNewDatabaseBicep();
    return armRes;
  }

  public async generateNewSqlServerBicep(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.AddFeatureInputs
  ): Promise<Result<v3.BicepTemplate[], FxError>> {
    const pluginCtx = { plugins: inputs.allPluginsAfterAdd };
    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "sql",
      "bicep"
    );
    const provisionOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDirectory, AzureSqlBicepFile.moduleTemplateFileName),
      pluginCtx
    );
    const provisionModules = await generateBicepFromFile(
      path.join(bicepTemplateDirectory, AzureSqlBicepFile.ProvisionModuleTemplateFileName),
      pluginCtx
    );
    const result: v3.BicepTemplate = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { azureSql: provisionModules },
      },
      Parameters: await fs.readJSON(path.join(bicepTemplateDirectory, Bicep.ParameterFileName)),
      Reference: {
        sqlResourceId: AzureSqlBicep.sqlResourceId,
        sqlEndpoint: AzureSqlBicep.sqlEndpoint,
        databaseName: AzureSqlBicep.databaseName,
      },
    };
    return ok([result]);
  }

  public async generateNewDatabaseBicep(): Promise<Result<v3.BicepTemplate[], FxError>> {
    const suffix = getUuid().substring(0, 6);
    const compileCtx = {
      suffix: suffix,
    };
    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "sql",
      "bicep"
    );
    const provisionOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDirectory, AzureSqlBicepFile.newDatabaseOrchestrationTemplateFileName),
      compileCtx
    );
    const provisionModules = await generateBicepFromFile(
      path.join(bicepTemplateDirectory, AzureSqlBicepFile.newDatabaseProvisionTemplateFileName),
      compileCtx
    );
    const result: v3.BicepTemplate = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { azureSql: provisionModules },
      },
      Reference: {
        sqlResourceId: AzureSqlBicep.sqlResourceId,
        sqlEndpoint: AzureSqlBicep.sqlEndpoint,
        databaseName: AzureSqlBicep.databaseName,
      },
    };
    return ok([result]);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.sql } })])
  async addInstance(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<string[], FxError>> {
    ensureSolutionSettings(ctx.projectSetting);
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const activeResourcePlugins = solutionSettings.activeResourcePlugins;
    if (!activeResourcePlugins.includes(this.name)) activeResourcePlugins.push(this.name);
    if (!solutionSettings.azureResources.includes(AzureResourceSQL.id))
      solutionSettings.azureResources.push(AzureResourceSQL.id);
    return ok([BuiltInFeaturePluginNames.identity]);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.sql } })])
  async updateBicep(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.UpdateInputs
  ): Promise<Result<v3.BicepTemplate[], FxError>> {
    const result: v3.BicepTemplate = {
      Reference: {
        sqlResourceId: AzureSqlBicep.sqlResourceId,
        sqlEndpoint: AzureSqlBicep.sqlEndpoint,
        databaseName: AzureSqlBicep.databaseName,
      },
    };
    return ok([result]);
  }

  async getQuestionsForProvision(
    ctx: v2.Context,
    inputs: Inputs,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    await this.loadConfig(envInfo as v3.EnvInfoV3, tokenProvider.azureAccountProvider);
    await SqlMgrClient.create(tokenProvider.azureAccountProvider, this.config);
    this.config.existSql = await SqlMgrClient.existAzureSQL();
    if (!this.config.existSql || inputs.platform === Platform.CLI_HELP) {
      // sql question will be returned in two cases:
      // 1. CLI_HELP; 2. SQL not exists
      const sqlNode = new QTreeNode({
        type: "group",
      });
      sqlNode.addChild(new QTreeNode(adminNameQuestion));
      sqlNode.addChild(new QTreeNode(adminPasswordQuestion));
      sqlNode.addChild(new QTreeNode(confirmPasswordQuestion));
      return ok(sqlNode);
    }
    return ok(undefined);
  }
  getRuleName(suffix: number): string {
    return Constants.firewall.localRule + suffix;
  }
  private removeDatabases(envInfo: v3.EnvInfoV3) {
    const sqlResource = envInfo.state[BuiltInFeaturePluginNames.sql] as v3.AzureSQL;
    if (sqlResource) {
      for (const key of Object.keys(sqlResource)) {
        if (key.startsWith(Constants.databaseName) && key !== Constants.databaseName) {
          delete sqlResource[key];
        }
      }
    }
  }
  private async parseLoginToken(azureAccountProvider: AzureAccountProvider) {
    // get login user info to set aad admin in sql
    try {
      const credential = await azureAccountProvider.getIdentityCredentialAsync();
      const token = await credential!.getToken(AzureScopes);
      const accessToken = token?.token;
      const tokenInfo = parseToken(accessToken!);
      this.config.aadAdmin = tokenInfo.name;
      this.config.aadAdminObjectId = tokenInfo.objectId;
      this.config.aadAdminType = tokenInfo.userType;
    } catch (error: any) {
      throw SqlResultFactory.SystemError(
        ErrorMessage.SqlUserInfoError.name,
        ErrorMessage.SqlUserInfoError.message(),
        error
      );
    }
  }
  @hooks([
    CommonErrorHandlerMW({
      telemetry: {
        component: BuiltInFeaturePluginNames.sql,
        eventName: Telemetry.stage.preProvision,
      },
    }),
  ])
  async provisionResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    ctx.logProvider.info(Message.startPreProvision);
    this.removeDatabases(envInfo);
    await this.loadConfig(envInfo, tokenProvider.azureAccountProvider);
    await SqlMgrClient.create(tokenProvider.azureAccountProvider, this.config);
    DialogUtils.init(ctx.userInteraction);
    this.config.existSql = await SqlMgrClient.existAzureSQL();
    if (!this.config.existSql) {
      this.config.admin = inputs[Constants.questionKey.adminName] as string;
      this.config.adminPassword = inputs[Constants.questionKey.adminPassword] as string;
      if (!this.config.admin || !this.config.adminPassword) {
        throw SqlResultFactory.SystemError(
          ErrorMessage.SqlInputError.name,
          ErrorMessage.SqlInputError.message()
        );
      }
    }
    await this.parseLoginToken(tokenProvider.azureAccountProvider);
    const sqlResource = envInfo.state[this.name] as v3.AzureSQL;
    sqlResource.admin = this.config.admin;
    sqlResource.adminPassword = this.config.adminPassword;
    ctx.logProvider.info(Message.endPreProvision);
    return ok(Void);
  }
  @hooks([
    CommonErrorHandlerMW({
      telemetry: {
        component: BuiltInFeaturePluginNames.sql,
        eventName: Telemetry.stage.postProvision,
      },
    }),
  ])
  async configureResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider,
    telemetryProps?: any
  ): Promise<Result<Void, FxError>> {
    ctx.logProvider?.info(Message.startPostProvision);

    await this.loadConfig(envInfo, tokenProvider.azureAccountProvider);

    //delete admin password
    const sqlState = envInfo.state[this.name];
    delete sqlState[Constants.adminPassword];

    await SqlMgrClient.create(tokenProvider.azureAccountProvider, this.config);

    DialogUtils.init(
      ctx.userInteraction,
      ProgressTitle.PostProvision,
      Object.keys(ConfigureMessage).length
    );

    if (telemetryProps) {
      telemetryProps[Telemetry.properties.skipAddingUser] = this.config.skipAddingUser
        ? Telemetry.valueYes
        : Telemetry.valueNo;
      telemetryProps[Telemetry.properties.dbCount] = this.config.databases.length.toString();
    }

    ctx.logProvider?.info(Message.addFirewall);
    await SqlMgrClient.addLocalFirewallRule();

    await DialogUtils.progressBar?.start();
    await DialogUtils.progressBar?.next(ConfigureMessage.postProvisionAddAadmin);
    await this.CheckAndSetAadAdmin(ctx, SqlMgrClient);

    this.getIdentity(envInfo);

    if (!this.config.skipAddingUser) {
      await DialogUtils.progressBar?.next(ConfigureMessage.postProvisionAddUser);
      // azure sql does not support service principal admin to add databse user currently, so just notice developer if so.
      if (this.config.aadAdminType === UserType.User) {
        ctx.logProvider?.info(Message.connectDatabase);
        const sqlClient = await SqlClient.create(tokenProvider.azureAccountProvider, this.config);
        ctx.logProvider?.info(Message.addDatabaseUser(this.config.identity));
        await this.addDatabaseUser(ctx, sqlClient, SqlMgrClient);
      } else {
        const message = ErrorMessage.ServicePrincipalWarning(
          this.config.identity,
          this.config.databaseName
        );
        ctx.logProvider?.warning(
          `[${Constants.pluginName}] ${message}. You can follow ${HelpLinks.default} to add database user ${this.config.identity}`
        );
      }
    } else {
      ctx.logProvider?.warning(
        `[${Constants.pluginName}] Skip adding database user. You can follow ${HelpLinks.default} to add database user ${this.config.identity}`
      );
    }

    await SqlMgrClient.deleteLocalFirewallRule();
    ctx.logProvider?.info(Message.endPostProvision);
    await DialogUtils.progressBar?.end(true);
    return ok(Void);
  }
  public async addDatabaseUser(
    ctx: v2.Context,
    sqlClient: SqlClient,
    managementClient: ManagementClient
  ): Promise<void> {
    let retryCount = 0;
    const databaseWithUser: { [key: string]: boolean } = {};
    this.config.databases.forEach((element) => {
      databaseWithUser[element] = false;
    });
    while (true) {
      try {
        for (const database in databaseWithUser) {
          if (!databaseWithUser[database]) {
            await sqlClient.addDatabaseUser(database);
            databaseWithUser[database] = true;
          }
        }
        return;
      } catch (error) {
        if (
          !SqlClient.isFireWallError(error?.innerError) ||
          retryCount >= Constants.maxRetryTimes
        ) {
          throw error;
        } else {
          retryCount++;
          ctx.logProvider?.warning(
            `[${Constants.pluginName}] Retry adding new firewall rule to access azure sql, because the local IP address has changed after added firewall rule for it. [Retry time: ${retryCount}]`
          );
          await managementClient.addLocalFirewallRule();
        }
      }
    }
  }
  private async CheckAndSetAadAdmin(ctx: v2.Context, client: ManagementClient) {
    ctx.logProvider?.info(Message.checkAadAdmin);
    const existAdmin = await client.existAadAdmin();
    if (!existAdmin) {
      ctx.logProvider?.info(Message.addSqlAadAdmin);
      await client.addAADadmin();
    } else {
      ctx.logProvider?.info(Message.skipAddAadAdmin);
    }
  }
  private getIdentity(envInfo: v3.EnvInfoV3) {
    const identityConfig = envInfo.state[Constants.identityPlugin] as v3.AzureIdentity;
    this.config.identity = identityConfig?.identityName;
    if (!this.config.identity) {
      const error = SqlResultFactory.SystemError(
        ErrorMessage.SqlGetConfigError.name,
        ErrorMessage.SqlGetConfigError.message(Constants.identityPlugin, Constants.identityName)
      );
      throw error;
    }
  }
  private loadConfigSql(sqlResource: v3.AzureSQL) {
    this.config.sqlEndpoint = sqlResource.sqlEndpoint;
    this.config.admin = sqlResource.admin;
    this.config.adminPassword = sqlResource.adminPassword;
    this.config.databaseName = sqlResource.databaseName;
    if (this.config.sqlEndpoint) {
      this.config.sqlServer = this.config.sqlEndpoint.split(".")[0];
    }
  }
  private loadDatabases(sqlResource: v3.AzureSQL) {
    for (const key of Object.keys(sqlResource)) {
      if (key.startsWith(Constants.databaseName)) {
        const value = sqlResource[key];
        this.config.databases.push(value);
      }
    }
  }
  private async loadConfig(envInfo: v3.EnvInfoV3, azureAccountProvider: AzureAccountProvider) {
    const sqlResource = envInfo.state[BuiltInFeaturePluginNames.sql] as v3.AzureSQL;
    if (sqlResource) {
      this.config.sqlResourceId = sqlResource.sqlResourceId;
      if (this.config.sqlResourceId) {
        try {
          this.config.azureSubscriptionId = getSubscriptionIdFromResourceId(
            this.config.sqlResourceId
          );
        } catch (error) {
          throw SqlResultFactory.UserError(
            ErrorMessage.SqlInvalidConfigError.name,
            ErrorMessage.SqlInvalidConfigError.message(this.config.sqlResourceId, error.message),
            error
          );
        }
        try {
          this.config.resourceGroup = getResourceGroupNameFromResourceId(this.config.sqlResourceId);
        } catch (error) {
          throw SqlResultFactory.UserError(
            ErrorMessage.SqlInvalidConfigError.name,
            ErrorMessage.SqlInvalidConfigError.message(this.config.sqlResourceId, error.message),
            error
          );
        }
      }
      this.loadConfigSql(sqlResource);
      this.loadDatabases(sqlResource);
    }
    const solutionConfig = envInfo.state.solution as v3.AzureSolutionConfig;
    this.config.resourceNameSuffix = solutionConfig.resourceNameSuffix;
    this.config.location = solutionConfig.location;
    this.config.tenantId = solutionConfig.tenantId;

    const skipAddingUser = envInfo.config?.[Constants.skipAddingSqlUser];
    if (skipAddingUser === undefined) {
      this.config.skipAddingUser = (await azureAccountProvider?.getIdentityCredentialAsync())
        ? false
        : true;
    } else {
      this.config.skipAddingUser = skipAddingUser as boolean;
    }
  }
}
