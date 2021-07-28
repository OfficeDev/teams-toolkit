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
  Func,
} from "@microsoft/teamsfx-api";
import { ManagementClient } from "./managementClient";
import { ErrorMessage } from "./errors";
import { SqlResultFactory } from "./results";
import { DialogUtils, ProgressTitle, ProcessMessage } from "./utils/dialogUtils";
import { SqlConfig } from "./config";
import { SqlClient } from "./sqlClient";
import { ContextUtils } from "./utils/contextUtils";
import { formatEndpoint, parseToken, UserType } from "./utils/commonUtils";
import { Constants, HelpLinks, Telemetry } from "./constants";
import { Message } from "./utils/message";
import { TelemetryUtils } from "./utils/telemetryUtils";
import { adminNameQuestion, adminPasswordQuestion, confirmPasswordQuestion } from "./questions";
import {
  sqlConfirmPasswordValidatorGenerator,
  sqlPasswordValidatorGenerator,
  sqlUserNameValidator,
} from "./utils/checkInput";

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
        sqlNode.addChild(new QTreeNode(adminNameQuestion));
        sqlNode.addChild(new QTreeNode(adminPasswordQuestion));
        sqlNode.addChild(new QTreeNode(confirmPasswordQuestion));
        return ok(sqlNode);
      }
      await this.init(ctx);
      if (this.config.azureSubscriptionId) {
        const managementClient: ManagementClient = new ManagementClient(ctx, this.config);
        await managementClient.init();
        this.config.existSql = await managementClient.existAzureSQL();
      }

      if (!this.config.existSql) {
        sqlNode.addChild(new QTreeNode(adminNameQuestion));
        sqlNode.addChild(new QTreeNode(adminPasswordQuestion));
        sqlNode.addChild(new QTreeNode(confirmPasswordQuestion));
      }
      return ok(sqlNode);
    }
    return ok(undefined);
  }

  async preProvision(ctx: PluginContext): Promise<Result<any, FxError>> {
    ctx.logProvider?.info(Message.startPreProvision);

    await this.init(ctx);
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

    // sql server name
    ctx.logProvider?.debug(Message.endpoint(this.config.sqlEndpoint));

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
    }

    ctx.config.set(Constants.sqlEndpoint, this.config.sqlEndpoint);
    ctx.config.set(Constants.databaseName, this.config.databaseName);

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
    TelemetryUtils.sendEvent(Telemetry.stage.preProvision, true);
    ctx.logProvider?.info(Message.endPreProvision);
    return ok(undefined);
  }

  async provision(ctx: PluginContext): Promise<Result<any, FxError>> {
    ctx.logProvider?.info(Message.startProvision);
    DialogUtils.init(ctx, ProgressTitle.Provision, ProgressTitle.ProvisionSteps);
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendEvent(Telemetry.stage.provision + Telemetry.startSuffix);

    const managementClient: ManagementClient = new ManagementClient(ctx, this.config);
    await managementClient.init();

    await DialogUtils.progressBar?.start();
    await DialogUtils.progressBar?.next(ProcessMessage.provisionSQL);
    if (!this.config.existSql) {
      ctx.logProvider?.info(Message.provisionSql);
      await managementClient.createAzureSQL();
    } else {
      ctx.logProvider?.info(Message.skipProvisionSql);
    }

    await DialogUtils.progressBar?.next(ProcessMessage.provisionDatabase);
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
    await DialogUtils.progressBar?.end();
    return ok(undefined);
  }

  async postProvision(ctx: PluginContext): Promise<Result<any, FxError>> {
    ctx.logProvider?.info(Message.startPostProvision);
    DialogUtils.init(ctx, ProgressTitle.PostProvision, ProgressTitle.PostProvisionSteps);
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendEvent(Telemetry.stage.postProvision + Telemetry.startSuffix, undefined, {
      [Telemetry.properties.skipAddingUser]: this.config.skipAddingUser
        ? Telemetry.valueYes
        : Telemetry.valueNo,
    });

    const sqlClient = new SqlClient(ctx, this.config);
    const managementClient: ManagementClient = new ManagementClient(ctx, this.config);
    await managementClient.init();

    ctx.logProvider?.info(Message.addFirewall);
    await managementClient.addLocalFirewallRule();
    await managementClient.addAzureFirewallRule();

    await DialogUtils.progressBar?.start();
    await DialogUtils.progressBar?.next(ProcessMessage.postProvisionAddAadmin);
    let existAdmin = false;
    ctx.logProvider?.info(Message.checkAadAdmin);
    existAdmin = await managementClient.existAadAdmin();
    if (!existAdmin) {
      ctx.logProvider?.info(Message.addSqlAadAdmin);
      await managementClient.addAADadmin();
    } else {
      ctx.logProvider?.info(Message.skipAddAadAdmin);
    }

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

    if (!this.config.skipAddingUser) {
      await DialogUtils.progressBar?.next(ProcessMessage.postProvisionAddUser);
      // azure sql does not support service principal admin to add databse user currently, so just notice developer if so.
      if (this.config.aadAdminType === UserType.User) {
        ctx.logProvider?.info(Message.connectDatabase);
        await sqlClient.initToken();

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
    await DialogUtils.progressBar?.end();
    return ok(undefined);
  }
}
