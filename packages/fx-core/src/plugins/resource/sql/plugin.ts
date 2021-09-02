// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  PluginContext,
  FxError,
  Result,
  ok,
  Stage,
  QTreeNode,
  Platform,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import { ManagementClient } from "./managementClient";
import { ErrorMessage } from "./errors";
import { SqlResultFactory } from "./results";
import {
  DialogUtils,
  ProgressTitle,
  ProvisionMessage,
  ConfigureMessage,
} from "./utils/dialogUtils";
import { SqlConfig } from "./config";
import { SqlClient } from "./sqlClient";
import { ContextUtils } from "./utils/contextUtils";
import { formatEndpoint, parseToken, UserType } from "./utils/commonUtils";
import {
  AzureSqlArmOutput,
  AzureSqlBicep,
  AzureSqlBicepFile,
  Constants,
  HelpLinks,
  Telemetry,
} from "./constants";
import { Message } from "./utils/message";
import { TelemetryUtils } from "./utils/telemetryUtils";
import { adminNameQuestion, adminPasswordQuestion, confirmPasswordQuestion } from "./questions";
import { Providers, ResourceManagementClientContext } from "@azure/arm-resources";
import path from "path";
import { generateBicepFiles, getTemplatesFolder } from "../../..";
import { Bicep, ConstantString } from "../../../common/constants";
import { ScaffoldArmTemplateResult } from "../../../common/armInterface";
import * as fs from "fs-extra";
import { getArmOutput } from "../utils4v2";
import { isArmSupportEnabled } from "../../../common";
import { IdentityArmOutput } from "../identity/constants";

export class SqlPluginImpl {
  config: SqlConfig = new SqlConfig();

  async init(ctx: PluginContext) {
    ContextUtils.init(ctx);
    const subscriptionInfo = await ctx.azureAccountProvider?.getSelectedSubscription();
    if (subscriptionInfo) {
      this.config.azureSubscriptionId = subscriptionInfo.subscriptionId;
    }
    this.config.resourceGroup = ContextUtils.getConfigString(
      Constants.solution,
      Constants.solutionConfigKey.resourceGroupName
    );
    this.config.resourceNameSuffix = ContextUtils.getConfigString(
      Constants.solution,
      Constants.solutionConfigKey.resourceNameSuffix
    );
    this.config.location = ContextUtils.getConfigString(
      Constants.solution,
      Constants.solutionConfigKey.location
    );
    this.config.tenantId = ContextUtils.getConfigString(
      Constants.solution,
      Constants.solutionConfigKey.tenantId
    );

    let defaultEndpoint = `${ctx.projectSettings!.appName}-sql-${this.config.resourceNameSuffix}`;
    defaultEndpoint = formatEndpoint(defaultEndpoint);
    this.config.sqlServer = defaultEndpoint;
    this.config.sqlEndpoint = `${this.config.sqlServer}.database.windows.net`;
    // database
    const defaultDatabase = `${ctx.projectSettings!.appName}-db-${this.config.resourceNameSuffix}`;
    this.config.databaseName = defaultDatabase;
  }

  async getQuestions(
    stage: Stage,
    ctx: PluginContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    if (stage === Stage.provision) {
      ctx.logProvider?.info(Message.startGetQuestions);
      const sqlNode = new QTreeNode({
        type: "group",
      });
      if (ctx.answers?.platform === Platform.CLI_HELP) {
        this.buildQuestionNode(sqlNode);
        return ok(sqlNode);
      }

      await this.init(ctx);
      this.config.prepareQuestions = true;
      if (isArmSupportEnabled()) {
        this.config.admin = ctx.config.get(Constants.admin) as string;
        this.config.adminPassword = ctx.config.get(Constants.adminPassword) as string;
        if (this.config.admin) {
          this.config.existSql = true;
        }
      } else if (this.config.azureSubscriptionId) {
        const managementClient: ManagementClient = await ManagementClient.create(ctx, this.config);
        this.config.existSql = await managementClient.existAzureSQL();
      }

      if (!this.config.existSql) {
        this.buildQuestionNode(sqlNode);
      }
      return ok(sqlNode);
    }
    return ok(undefined);
  }

  async preProvision(ctx: PluginContext): Promise<Result<any, FxError>> {
    ctx.logProvider?.info(Message.startPreProvision);

    await this.init(ctx);
    if (!this.config.azureSubscriptionId) {
      const error = SqlResultFactory.SystemError(
        ErrorMessage.SqlGetConfigError.name,
        ErrorMessage.SqlGetConfigError.message(
          Constants.solutionConfigKey.subscriptionId,
          Constants.solution
        )
      );
      ctx.logProvider?.error(error.message);
    }

    DialogUtils.init(ctx);
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendEvent(Telemetry.stage.preProvision + Telemetry.startSuffix);

    const skipAddingUser = ctx.config.get(Constants.skipAddingUser);
    if (skipAddingUser === undefined) {
      this.config.skipAddingUser = (await ctx.azureAccountProvider?.getIdentityCredentialAsync())
        ? false
        : true;
    } else {
      this.config.skipAddingUser = skipAddingUser as boolean;
    }

    if (!this.config.prepareQuestions) {
      this.config.existSql = true;
    }

    if (!this.config.existSql) {
      this.config.admin = ctx.answers![Constants.questionKey.adminName] as string;
      this.config.adminPassword = ctx.answers![Constants.questionKey.adminPassword] as string;

      if (!this.config.admin || !this.config.adminPassword) {
        const error = SqlResultFactory.SystemError(
          ErrorMessage.SqlInputError.name,
          ErrorMessage.SqlInputError.message()
        );
        ctx.logProvider?.error(ErrorMessage.SqlInputError.message());
        throw error;
      }
      ctx.config.set(Constants.admin, this.config.admin);
      ctx.config.set(Constants.adminPassword, this.config.adminPassword);
    }

    // get login user info to set aad admin in sql
    try {
      const credential = await ctx.azureAccountProvider!.getAccountCredentialAsync();
      const token = await credential!.getToken();
      const accessToken = token.accessToken;
      const tokenInfo = parseToken(accessToken);
      this.config.aadAdmin = tokenInfo.name;
      this.config.aadAdminObjectId = tokenInfo.objectId;
      this.config.aadAdminType = tokenInfo.userType;
      ctx.logProvider?.debug(Message.adminName(tokenInfo.name));
    } catch (_error) {
      ctx.logProvider?.error(ErrorMessage.SqlUserInfoError.message() + `:${_error.message}`);
      const error = SqlResultFactory.SystemError(
        ErrorMessage.SqlUserInfoError.name,
        ErrorMessage.SqlUserInfoError.message(),
        _error
      );
      throw error;
    }

    if (isArmSupportEnabled()) {
      this.setContext(ctx);
    }
    TelemetryUtils.sendEvent(Telemetry.stage.preProvision, true);
    ctx.logProvider?.info(Message.endPreProvision);
    return ok(undefined);
  }

  async provision(ctx: PluginContext): Promise<Result<any, FxError>> {
    ctx.logProvider?.info(Message.startProvision);
    DialogUtils.init(ctx, ProgressTitle.Provision, Object.keys(ProvisionMessage).length);
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendEvent(Telemetry.stage.provision + Telemetry.startSuffix);

    const managementClient: ManagementClient = await ManagementClient.create(ctx, this.config);

    await DialogUtils.progressBar?.start();
    await DialogUtils.progressBar?.next(ProvisionMessage.checkProvider);
    if (!this.config.existSql) {
      try {
        ctx.logProvider?.info(Message.checkProvider);
        const credentials = await ctx.azureAccountProvider!.getAccountCredentialAsync();
        const resourceManagementClient = new Providers(
          new ResourceManagementClientContext(credentials!, this.config.azureSubscriptionId)
        );
        await resourceManagementClient.register(Constants.resourceProvider);
      } catch (error) {
        ctx.logProvider?.info(Message.registerResourceProviderFailed(error?.message));
      }
    } else {
      ctx.logProvider?.info(Message.skipCheckProvider);
    }

    await DialogUtils.progressBar?.next(ProvisionMessage.provisionSQL);
    if (!this.config.existSql) {
      ctx.logProvider?.info(Message.provisionSql);
      await managementClient.createAzureSQL();
    } else {
      ctx.logProvider?.info(Message.skipProvisionSql);
    }

    await DialogUtils.progressBar?.next(ProvisionMessage.provisionDatabase);
    let existDatabase = false;
    if (this.config.existSql) {
      ctx.logProvider?.info(Message.checkDatabase);
      existDatabase = await managementClient.existDatabase();
    }
    if (!existDatabase) {
      ctx.logProvider?.info(Message.provisionDatabase);
      await managementClient.createDatabase();
    } else {
      ctx.logProvider?.info(Message.skipProvisionDatabase);
    }

    TelemetryUtils.sendEvent(Telemetry.stage.provision, true);
    ctx.logProvider?.info(Message.endProvision);
    await DialogUtils.progressBar?.end(true);
    return ok(undefined);
  }

  async postProvision(ctx: PluginContext): Promise<Result<any, FxError>> {
    ctx.logProvider?.info(Message.startPostProvision);
    DialogUtils.init(ctx, ProgressTitle.PostProvision, Object.keys(ConfigureMessage).length);
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendEvent(Telemetry.stage.postProvision + Telemetry.startSuffix, undefined, {
      [Telemetry.properties.skipAddingUser]: this.config.skipAddingUser
        ? Telemetry.valueYes
        : Telemetry.valueNo,
    });

    if (isArmSupportEnabled()) {
      this.syncArmOutput(ctx);
    }

    ctx.config.set(Constants.sqlEndpoint, this.config.sqlEndpoint);
    ctx.config.set(Constants.databaseName, this.config.databaseName);
    ctx.config.delete(Constants.adminPassword);
    this.config.prepareQuestions = false;

    const managementClient: ManagementClient = await ManagementClient.create(ctx, this.config);

    ctx.logProvider?.info(Message.addFirewall);
    await this.AddFireWallRules(managementClient);

    await DialogUtils.progressBar?.start();
    await DialogUtils.progressBar?.next(ConfigureMessage.postProvisionAddAadmin);
    await this.CheckAndSetAadAdmin(ctx, managementClient);

    this.getIdentity(ctx);

    if (!this.config.skipAddingUser) {
      await DialogUtils.progressBar?.next(ConfigureMessage.postProvisionAddUser);
      // azure sql does not support service principal admin to add databse user currently, so just notice developer if so.
      if (this.config.aadAdminType === UserType.User) {
        ctx.logProvider?.info(Message.connectDatabase);
        const sqlClient = await SqlClient.create(ctx, this.config);

        let existUser = false;
        ctx.logProvider?.info(Message.checkDatabaseUser);
        existUser = await sqlClient.existUser();

        if (!existUser) {
          ctx.logProvider?.info(Message.addDatabaseUser(this.config.identity));
          await sqlClient.addDatabaseUser();
        } else {
          ctx.logProvider?.info(Message.existUser(this.config.identity));
        }
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

    await managementClient.deleteLocalFirewallRule();

    TelemetryUtils.sendEvent(Telemetry.stage.postProvision, true, {
      [Telemetry.properties.skipAddingUser]: this.config.skipAddingUser
        ? Telemetry.valueYes
        : Telemetry.valueNo,
    });
    ctx.logProvider?.info(Message.endPostProvision);
    await DialogUtils.progressBar?.end(true);
    return ok(undefined);
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<Result<any, FxError>> {
    const selectedPlugins = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      .activeResourcePlugins;
    const context = {
      Plugins: selectedPlugins,
    };

    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "sql",
      "bicep"
    );

    const moduleTemplateFilePath = path.join(
      bicepTemplateDirectory,
      AzureSqlBicepFile.moduleTemplateFileName
    );
    const moduleContentResult = await generateBicepFiles(moduleTemplateFilePath, context);
    if (moduleContentResult.isErr()) {
      throw moduleContentResult.error;
    }

    const parameterTemplateFilePath = path.join(
      bicepTemplateDirectory,
      Bicep.ParameterOrchestrationFileName
    );
    const moduleOrchestrationFilePath = path.join(
      bicepTemplateDirectory,
      Bicep.ModuleOrchestrationFileName
    );
    const outputTemplateFilePath = path.join(
      bicepTemplateDirectory,
      Bicep.OutputOrchestrationFileName
    );
    const parameterFilePath = path.join(bicepTemplateDirectory, Bicep.ParameterFileName);

    const result: ScaffoldArmTemplateResult = {
      Modules: {
        azureSqlProvision: {
          Content: moduleContentResult.value,
        },
      },
      Orchestration: {
        ParameterTemplate: {
          Content: await fs.readFile(parameterTemplateFilePath, ConstantString.UTF8Encoding),
          ParameterJson: JSON.parse(
            await fs.readFile(parameterFilePath, ConstantString.UTF8Encoding)
          ),
        },
        ModuleTemplate: {
          Content: await fs.readFile(moduleOrchestrationFilePath, ConstantString.UTF8Encoding),
          Outputs: {
            sqlEndpoint: AzureSqlBicep.sqlEndpoint,
            databaseName: AzureSqlBicep.databaseName,
          },
        },
        OutputTemplate: {
          Content: await fs.readFile(outputTemplateFilePath, ConstantString.UTF8Encoding),
        },
      },
    };
    return ok(result);
  }

  private setContext(ctx: PluginContext) {
    ctx.config.set(Constants.admin, this.config.admin);
    ctx.config.set(Constants.adminPassword, this.config.adminPassword);
  }

  private syncArmOutput(ctx: PluginContext) {
    this.config.sqlEndpoint = getArmOutput(ctx, AzureSqlArmOutput.sqlEndpoint)!;
    this.config.databaseName = getArmOutput(ctx, AzureSqlArmOutput.databaseName)!;
    this.config.sqlServer = this.config.sqlEndpoint.split(".")[0];
  }

  private buildQuestionNode(sqlNode: QTreeNode) {
    sqlNode.addChild(new QTreeNode(adminNameQuestion));
    sqlNode.addChild(new QTreeNode(adminPasswordQuestion));
    sqlNode.addChild(new QTreeNode(confirmPasswordQuestion));
  }

  private async AddFireWallRules(client: ManagementClient) {
    await client.addLocalFirewallRule();
    if (!isArmSupportEnabled()) {
      await client.addAzureFirewallRule();
    }
  }

  private async CheckAndSetAadAdmin(ctx: PluginContext, client: ManagementClient) {
    let existAdmin = false;
    ctx.logProvider?.info(Message.checkAadAdmin);
    existAdmin = await client.existAadAdmin();
    if (!existAdmin) {
      ctx.logProvider?.info(Message.addSqlAadAdmin);
      await client.addAADadmin();
    } else {
      ctx.logProvider?.info(Message.skipAddAadAdmin);
    }
  }

  private getIdentity(ctx: PluginContext) {
    if (isArmSupportEnabled()) {
      this.config.identity = getArmOutput(ctx, IdentityArmOutput.identity)!;
    } else {
      const identityConfig = ctx.configOfOtherPlugins.get(Constants.identityPlugin);
      this.config.identity = identityConfig!.get(Constants.identity) as string;
      if (!this.config.identity) {
        const error = SqlResultFactory.SystemError(
          ErrorMessage.SqlGetConfigError.name,
          ErrorMessage.SqlGetConfigError.message(Constants.identityPlugin, Constants.identity)
        );
        ctx.logProvider?.error(error.message);
        throw error;
      }
    }
  }
}
