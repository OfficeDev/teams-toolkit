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
  traverse,
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
import { AzureSqlBicep, AzureSqlBicepFile, Constants, HelpLinks, Telemetry } from "./constants";
import { Message } from "./utils/message";
import { TelemetryUtils } from "./utils/telemetryUtils";
import { adminNameQuestion, adminPasswordQuestion, confirmPasswordQuestion } from "./questions";
import { Providers, ResourceManagementClientContext } from "@azure/arm-resources";
import path from "path";
import { getTemplatesFolder } from "../../../folder";
import { Bicep, ConstantString } from "../../../common/constants";
import { ArmTemplateResult } from "../../../common/armInterface";
import * as fs from "fs-extra";
import {
  getResourceGroupNameFromResourceId,
  getSubscriptionIdFromResourceId,
  isArmSupportEnabled,
} from "../../../common";
import { getActivatedV2ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../solution/fx-solution/v2/adaptor";
import { compileHandlebarsTemplateString } from "../../../common/tools";

export class SqlPluginImpl {
  config: SqlConfig = new SqlConfig();

  async loadConfig(ctx: PluginContext) {
    this.loadConfigSubscription(ctx);
    this.loadConfigResourceGroup(ctx);
    this.config.resourceNameSuffix = ContextUtils.getConfig<string>(
      ctx,
      Constants.solution,
      Constants.solutionConfigKey.resourceNameSuffix
    );
    this.config.location = ContextUtils.getConfig<string>(
      ctx,
      Constants.solution,
      Constants.solutionConfigKey.location
    );
    this.config.tenantId = ContextUtils.getConfig<string>(
      ctx,
      Constants.solution,
      Constants.solutionConfigKey.tenantId
    );

    this.loadConfigSql(ctx);
  }

  async getQuestions(
    stage: Stage,
    ctx: PluginContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    if (stage === Stage.provision && ctx.answers?.platform === Platform.CLI_HELP) {
      const sqlNode = this.buildQuestionNode();
      return ok(sqlNode);
    }
    return ok(undefined);
  }

  async preProvision(ctx: PluginContext): Promise<Result<any, FxError>> {
    ctx.logProvider?.info(Message.startPreProvision);
    await this.loadConfig(ctx);

    DialogUtils.init(ctx);
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendEvent(Telemetry.stage.preProvision + Telemetry.startSuffix);

    await this.loadSkipAddingUser(ctx);
    await this.checkSqlExisting(ctx);

    if (!this.config.existSql) {
      await this.askInputs(ctx);
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

    await this.parseLoginToken(ctx);

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
      } catch (error: any) {
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

    ctx.config.set(Constants.sqlEndpoint, this.config.sqlEndpoint);
    ctx.config.set(Constants.databaseName, this.config.databaseName);

    TelemetryUtils.sendEvent(Telemetry.stage.provision, true);
    ctx.logProvider?.info(Message.endProvision);
    await DialogUtils.progressBar?.end(true);
    return ok(undefined);
  }

  async postProvision(ctx: PluginContext): Promise<Result<any, FxError>> {
    ctx.logProvider?.info(Message.startPostProvision);
    await this.loadConfig(ctx);

    DialogUtils.init(ctx, ProgressTitle.PostProvision, Object.keys(ConfigureMessage).length);
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendEvent(Telemetry.stage.postProvision + Telemetry.startSuffix, undefined, {
      [Telemetry.properties.skipAddingUser]: this.config.skipAddingUser
        ? Telemetry.valueYes
        : Telemetry.valueNo,
    });

    if (isArmSupportEnabled()) {
      this.config.sqlServer = this.config.sqlEndpoint.split(".")[0];
      this.config.resourceGroup = getResourceGroupNameFromResourceId(this.config.sqlResourceId);
      this.config.azureSubscriptionId = getSubscriptionIdFromResourceId(this.config.sqlResourceId);
    }

    ctx.config.delete(Constants.adminPassword);

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
        ctx.logProvider?.info(Message.addDatabaseUser(this.config.identity));
        await this.addDatabaseUser(ctx, sqlClient, managementClient);
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

  public async updateArmTemplates(ctx: PluginContext): Promise<Result<any, FxError>> {
    const result: ArmTemplateResult = {
      Reference: {
        sqlResourceId: AzureSqlBicep.sqlResourceId,
        sqlEndpoint: AzureSqlBicep.sqlEndpoint,
        databaseName: AzureSqlBicep.databaseName,
      },
    };
    return ok(result);
  }

  public async addDatabaseUser(
    ctx: PluginContext,
    sqlClient: SqlClient,
    managementClient: ManagementClient
  ): Promise<void> {
    let retryCount = 0;
    while (true) {
      try {
        await sqlClient.addDatabaseUser();
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

  public async generateArmTemplates(ctx: PluginContext): Promise<Result<any, FxError>> {
    const azureSolutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
    const plugins = getActivatedV2ResourcePlugins(azureSolutionSettings).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    ); // This function ensures return result won't be empty
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };
    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "sql",
      "bicep"
    );
    let provisionOrchestration = await fs.readFile(
      path.join(bicepTemplateDirectory, Bicep.ProvisionFileName),
      ConstantString.UTF8Encoding
    );
    provisionOrchestration = compileHandlebarsTemplateString(provisionOrchestration, pluginCtx);
    let provisionModules = await fs.readFile(
      path.join(bicepTemplateDirectory, AzureSqlBicepFile.ProvisionModuleTemplateFileName),
      ConstantString.UTF8Encoding
    );
    provisionModules = compileHandlebarsTemplateString(provisionModules, pluginCtx);
    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { azureSql: provisionModules },
      },
      Parameters: JSON.parse(
        await fs.readFile(
          path.join(bicepTemplateDirectory, Bicep.ParameterFileName),
          ConstantString.UTF8Encoding
        )
      ),
      Reference: {
        sqlResourceId: AzureSqlBicep.sqlResourceId,
        sqlEndpoint: AzureSqlBicep.sqlEndpoint,
        databaseName: AzureSqlBicep.databaseName,
      },
    };
    return ok(result);
  }

  private setContext(ctx: PluginContext) {
    ctx.config.set(Constants.admin, this.config.admin);
    ctx.config.set(Constants.adminPassword, this.config.adminPassword);
  }

  private buildQuestionNode() {
    const sqlNode = new QTreeNode({
      type: "group",
    });
    sqlNode.addChild(new QTreeNode(adminNameQuestion));
    sqlNode.addChild(new QTreeNode(adminPasswordQuestion));
    sqlNode.addChild(new QTreeNode(confirmPasswordQuestion));
    return sqlNode;
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
    const identityConfig = ctx.envInfo.state.get(Constants.identityPlugin);
    this.config.identity = identityConfig!.get(Constants.identityName) as string;
    if (!this.config.identity) {
      const error = SqlResultFactory.SystemError(
        ErrorMessage.SqlGetConfigError.name,
        ErrorMessage.SqlGetConfigError.message(Constants.identityPlugin, Constants.identityName)
      );
      ctx.logProvider?.error(error.message);
      throw error;
    }
  }

  private async loadSkipAddingUser(ctx: PluginContext) {
    const skipAddingUser = ctx.envInfo.config?.[Constants.skipAddingSqlUser];
    if (skipAddingUser === undefined) {
      this.config.skipAddingUser = (await ctx.azureAccountProvider?.getIdentityCredentialAsync())
        ? false
        : true;
    } else {
      this.config.skipAddingUser = skipAddingUser as boolean;
    }
  }

  private async checkSqlExisting(ctx: PluginContext) {
    const managementClient: ManagementClient = await ManagementClient.create(ctx, this.config);
    if (isArmSupportEnabled()) {
      this.config.admin = ctx.config.get(Constants.admin) as string;
      this.config.adminPassword = ctx.config.get(Constants.adminPassword) as string;
      this.config.sqlEndpoint = ctx.config.get(Constants.sqlEndpoint);
      if (this.config.sqlEndpoint && this.config.azureSubscriptionId) {
        this.config.existSql = await managementClient.existAzureSQL();
      }
    } else {
      this.config.existSql = await managementClient.existAzureSQL();
    }
  }

  public async askInputs(ctx: PluginContext) {
    const node = this.buildQuestionNode();
    const res = await traverse(node, ctx.answers!, ctx.ui!);
    if (res.isErr()) {
      throw SqlResultFactory.UserError(
        ErrorMessage.SqlAskInputError.name,
        ErrorMessage.SqlAskInputError.message(),
        res.error
      );
    }
  }

  private async parseLoginToken(ctx: PluginContext) {
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
    } catch (error: any) {
      ctx.logProvider?.error(ErrorMessage.SqlUserInfoError.message() + `:${error.message}`);
      throw SqlResultFactory.SystemError(
        ErrorMessage.SqlUserInfoError.name,
        ErrorMessage.SqlUserInfoError.message(),
        error
      );
    }
  }

  private loadConfigResourceGroup(ctx: PluginContext) {
    if (isArmSupportEnabled()) {
      this.config.sqlResourceId = ctx.config.get(Constants.sqlResourceId) as string;
      if (this.config.sqlResourceId) {
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
    } else {
      this.config.resourceGroup = ContextUtils.getConfig<string>(
        ctx,
        Constants.solution,
        Constants.solutionConfigKey.resourceGroupName
      );
    }
  }

  private loadConfigSubscription(ctx: PluginContext) {
    if (isArmSupportEnabled()) {
      this.config.sqlResourceId = ctx.config.get(Constants.sqlResourceId) as string;
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
      }
    } else {
      this.config.azureSubscriptionId = ContextUtils.getConfig<string>(
        ctx,
        Constants.solution,
        Constants.solutionConfigKey.subscriptionId
      );
    }
  }

  private loadConfigSql(ctx: PluginContext) {
    if (isArmSupportEnabled()) {
      this.config.sqlEndpoint = ctx.config.get(Constants.sqlEndpoint) as string;
      this.config.databaseName = ctx.config.get(Constants.databaseName) as string;
      if (this.config.sqlEndpoint) {
        this.config.sqlServer = this.config.sqlEndpoint.split(".")[0];
      }
    } else {
      let defaultEndpoint = `${ctx.projectSettings!.appName}-sql-${this.config.resourceNameSuffix}`;
      defaultEndpoint = formatEndpoint(defaultEndpoint);
      this.config.sqlServer = defaultEndpoint;
      this.config.sqlEndpoint = `${this.config.sqlServer}.database.windows.net`;

      const defaultDatabase = `${ctx.projectSettings!.appName}-db-${
        this.config.resourceNameSuffix
      }`;
      this.config.databaseName = defaultDatabase;
    }
  }
}
