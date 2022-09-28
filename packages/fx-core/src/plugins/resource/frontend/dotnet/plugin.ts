// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Func,
  PluginContext,
  ok,
  ReadonlyPluginConfig,
  Result,
  FxError,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import {
  DotnetPluginInfo as PluginInfo,
  DotnetConfigInfo as ConfigInfo,
  DependentPluginInfo,
  DotnetPathInfo as PathInfo,
  WebappBicepFile,
  WebappBicep,
  AppSettingsPlaceholders as Placeholders,
  RegularExpr,
} from "./constants";
import { Messages } from "./resources/messages";
import { scaffoldFromZipPackage } from "./ops/scaffold";
import { AzureClientFactory } from "./utils/azure-client";
import { DotnetConfigKey as ConfigKey } from "./enum";
import {
  FetchConfigError,
  FileIOError,
  NoProjectSettingError,
  ProjectPathError,
  runWithErrorCatchAndThrow,
} from "./resources/errors";
import * as Deploy from "./ops/deploy";
import { Logger } from "../utils/logger";
import path from "path";
import fs from "fs-extra";
import { getTemplatesFolder } from "../../../../folder";
import {
  generateBicepFromFile,
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getSubscriptionIdFromResourceId,
  isAadManifestEnabled,
} from "../../../../common/tools";
import { TemplateInfo } from "./resources/templateInfo";
import { Bicep } from "../../../../common/constants";
import { getActivatedV2ResourcePlugins } from "../../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../../solution/fx-solution/v2/adaptor";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { PluginImpl } from "../interface";
import { ProgressHelper } from "../utils/progress-helper";
import { WebappDeployProgress as DeployProgress } from "./resources/steps";
import { BotOptionItem, TabOptionItem, TabSsoItem } from "../../../solution/fx-solution/question";
import { PluginNames } from "../../../solution/fx-solution/constants";
import { CoreQuestionNames } from "../../../../core/question";
import { convertToAlphanumericOnly } from "../../../../common/utils";
import { Site } from "@azure/arm-appservice";

type TeamsFxResult = Result<any, FxError>;

export interface DotnetPluginConfig {
  /* Config from solution */
  resourceGroupName?: string;
  subscriptionId?: string;
  resourceNameSuffix?: string;
  location?: string;

  /* Config exported by Dotnet plugin */
  webAppName?: string;
  appServicePlanName?: string;
  endpoint?: string;
  domain?: string;
  projectFilePath?: string;
  webAppResourceId?: string;

  /* Intermediate  */
  site?: Site;
}

export class DotnetPluginImpl implements PluginImpl {
  private syncConfigFromContext(ctx: PluginContext): DotnetPluginConfig {
    const config: DotnetPluginConfig = {};
    const solutionConfig: ReadonlyPluginConfig | undefined = ctx.envInfo.state.get(
      DependentPluginInfo.solutionPluginName
    );
    config.resourceGroupName = solutionConfig?.get(DependentPluginInfo.resourceGroupName) as string;
    config.subscriptionId = solutionConfig?.get(DependentPluginInfo.subscriptionId) as string;

    config.webAppName = ctx.config.get(ConfigInfo.webAppName) as string;
    config.appServicePlanName = ctx.config.get(ConfigInfo.appServicePlanName) as string;
    config.projectFilePath = ctx.projectSettings?.pluginSettings?.projectFilePath as string;

    // Resource id priors to other configs
    const webAppResourceId = ctx.config.get(ConfigKey.webAppResourceId) as string;
    if (webAppResourceId) {
      config.webAppResourceId = webAppResourceId;
      config.resourceGroupName = getResourceGroupNameFromResourceId(webAppResourceId);
      config.webAppName = getSiteNameFromResourceId(webAppResourceId);
      config.subscriptionId = getSubscriptionIdFromResourceId(webAppResourceId);
    }
    return config;
  }

  private checkAndGet<T>(v: T | undefined, key: string) {
    if (v) {
      return v;
    }
    throw new FetchConfigError(key);
  }

  public async scaffold(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartScaffold);

    if (!ctx.projectSettings) {
      throw new NoProjectSettingError();
    }

    const projectName = ctx.projectSettings!.appName;
    const safeProjectName =
      ctx.answers?.[CoreQuestionNames.SafeProjectName] ?? convertToAlphanumericOnly(projectName);
    const capabilities = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      ?.capabilities;
    await scaffoldFromZipPackage(
      ctx.root,
      new TemplateInfo(
        { ProjectName: projectName, SafeProjectName: safeProjectName },
        isAadManifestEnabled() && !capabilities.includes(TabSsoItem.id)
          ? TemplateInfo.NoneSsoScenario
          : TemplateInfo.DefaultScenario
      )
    );
    ctx.projectSettings.pluginSettings = {
      ...ctx.projectSettings?.pluginSettings,
      projectFilePath: path.resolve(ctx.root, PathInfo.projectFilename(projectName)),
    };

    Logger.info(Messages.EndScaffold);
    return ok(undefined);
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<TeamsFxResult> {
    if (
      ctx.answers?.existingCapabilities?.includes(BotOptionItem.id) ||
      ctx.answers?.existingCapabilities?.includes(TabOptionItem.id)
    ) {
      return ok({} as ArmTemplateResult);
    }

    Logger.info(Messages.StartGenerateArmTemplates);

    const bicepTemplateDirectory = PathInfo.bicepTemplateFolder(getTemplatesFolder());

    const provisionTemplateFilePath = path.join(bicepTemplateDirectory, Bicep.ProvisionFileName);
    const provisionWebappTemplateFilePath = path.join(
      bicepTemplateDirectory,
      WebappBicepFile.provisionTemplateFileName
    );

    const configTemplateFilePath = path.join(bicepTemplateDirectory, Bicep.ConfigFileName);
    const configWebappTemplateFilePath = path.join(
      bicepTemplateDirectory,
      WebappBicepFile.configurationTemplateFileName
    );

    const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };

    const provisionOrchestration = await generateBicepFromFile(
      provisionTemplateFilePath,
      pluginCtx
    );
    const provisionModule = await generateBicepFromFile(provisionWebappTemplateFilePath, pluginCtx);
    const configOrchestration = await generateBicepFromFile(configTemplateFilePath, pluginCtx);
    const configModule = await generateBicepFromFile(configWebappTemplateFilePath, pluginCtx);
    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { webapp: provisionModule },
      },
      Configuration: {
        Orchestration: configOrchestration,
        Modules: { webapp: configModule },
      },
      Reference: WebappBicep.Reference,
    };

    Logger.info(Messages.EndGenerateArmTemplates);
    return ok(result);
  }

  public async updateArmTemplates(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.EndUpdateArmTemplates);

    const bicepTemplateDirectory = PathInfo.bicepTemplateFolder(getTemplatesFolder());
    const configWebappTemplateFilePath = path.join(
      bicepTemplateDirectory,
      WebappBicepFile.configurationTemplateFileName
    );

    const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };
    const configModule = await generateBicepFromFile(configWebappTemplateFilePath, pluginCtx);

    const result: ArmTemplateResult = {
      Reference: WebappBicep.Reference,
      Configuration: {
        Modules: { webapp: configModule },
      },
    };

    Logger.info(Messages.EndUpdateArmTemplates);
    return ok(result);
  }

  public async localDebug(ctx: PluginContext): Promise<TeamsFxResult> {
    ctx.envInfo.state.get(PluginInfo.pluginName)?.set(ConfigInfo.indexPath, PathInfo.indexPath);
    return ok(undefined);
  }

  public async postLocalDebug(ctx: PluginContext): Promise<TeamsFxResult> {
    const appSettingsPath = path.join(ctx.root, PathInfo.appSettingDevelopment);
    let appSettings: string;
    if (
      !(await runWithErrorCatchAndThrow(
        new FileIOError(appSettingsPath),
        async () => await fs.pathExists(appSettingsPath)
      ))
    ) {
      // if appsetting file not exist, generate a new one
      // TODO(qidon): load content from resource file or template
      appSettings =
        '\
{\r\n\
  "Logging": {\r\n\
    "LogLevel": {\r\n\
      "Default": "Information",\r\n\
      "Microsoft": "Warning",\r\n\
      "Microsoft.Hosting.Lifetime": "Information"\r\n\
    }\r\n\
  },\r\n\
  "AllowedHosts": "*",\r\n\
  "TeamsFx": {\r\n\
    "Authentication": {\r\n\
      "ClientId": "$clientId$",\r\n\
      "ClientSecret": "$client-secret$",\r\n\
      "OAuthAuthority": "$oauthAuthority$"\r\n\
    }\r\n\
  }\r\n\
}\r\n';
    } else {
      appSettings = await runWithErrorCatchAndThrow(
        new FileIOError(appSettingsPath),
        async () => await fs.readFile(appSettingsPath, "utf-8")
      );
    }

    const clientId =
      ctx.envInfo.state.get(PluginNames.AAD)?.get(DependentPluginInfo.aadClientId) ??
      Placeholders.clientId;
    const clientSecret =
      ctx.envInfo.state.get(PluginNames.AAD)?.get(DependentPluginInfo.aadClientSecret) ??
      Placeholders.clientSecret;
    const tenantId = ctx.envInfo.state
      .get(PluginNames.SOLUTION)
      ?.get(DependentPluginInfo.appTenantId);
    const oauthAuthority = tenantId ? PathInfo.oauthHost(tenantId) : Placeholders.oauthAuthority;

    appSettings = appSettings.replace(RegularExpr.clientId, clientId);
    appSettings = appSettings.replace(RegularExpr.clientSecret, clientSecret);
    appSettings = appSettings.replace(RegularExpr.oauthAuthority, oauthAuthority);
    await runWithErrorCatchAndThrow(
      new FileIOError(appSettingsPath),
      async () => await fs.writeFile(appSettingsPath, appSettings, "utf-8")
    );
    return ok(undefined);
  }

  public async postProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    return ok(undefined);
  }

  public async preDeploy(ctx: PluginContext): Promise<TeamsFxResult> {
    return ok(undefined);
  }

  public async executeUserTask(func: Func, ctx: PluginContext): Promise<TeamsFxResult> {
    return ok(undefined);
  }

  public async deploy(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartDeploy);
    await ProgressHelper.startProgress(ctx.ui, DeployProgress);

    const config = this.syncConfigFromContext(ctx);

    const webAppName = this.checkAndGet(config.webAppName, ConfigKey.webAppName);
    const resourceGroupName = this.checkAndGet(
      config.resourceGroupName,
      ConfigKey.resourceGroupName
    );
    const subscriptionId = this.checkAndGet(config.subscriptionId, ConfigKey.subscriptionId);
    const credential = this.checkAndGet(
      await ctx.azureAccountProvider?.getIdentityCredentialAsync(),
      ConfigKey.credential
    );

    const projectFilePath = path.resolve(
      ctx.root,
      this.checkAndGet(config.projectFilePath, ConfigKey.projectFilePath)
    );

    await runWithErrorCatchAndThrow(
      new ProjectPathError(projectFilePath),
      async () => await fs.pathExists(projectFilePath)
    );
    const projectPath = path.dirname(projectFilePath);

    const runtime = PluginInfo.defaultRuntime;

    const client = AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId);

    await Deploy.build(projectPath, runtime);

    const folderToBeZipped = PathInfo.publishFolderPath(projectPath);
    await Deploy.zipDeploy(client, resourceGroupName, webAppName, folderToBeZipped);

    await ProgressHelper.endProgress(true);
    Logger.info(Messages.EndDeploy);
    return ok(undefined);
  }
}
