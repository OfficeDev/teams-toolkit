/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { hooks } from "@feathersjs/hooks/lib";
import {
  AzureSolutionSettings,
  combine,
  ConfigMap,
  DynamicPlatforms,
  EnvConfigSchema,
  err,
  Func,
  FxError,
  Inputs,
  ok,
  OptionItem,
  Platform,
  Plugin,
  QTreeNode,
  Result,
  Solution,
  SolutionConfig,
  SolutionContext,
  Stage,
  SubscriptionInfo,
  SystemError,
  TeamsAppManifest,
  UserError,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import Mustache from "mustache";
import path from "path";
import { Container, Service } from "typedi";
import * as util from "util";
import { PluginDisplayName, HelpLinks } from "../../../common/constants";
import { LocalSettingsTeamsAppKeys } from "../../../common/localSettingsConstants";
import { ListCollaboratorResult, PermissionsResult } from "../../../common/permissionInterface";
import {
  deepCopy,
  getHashedEnv,
  getResourceGroupInPortal,
  isCheckAccountError,
  isMultiEnvEnabled,
  isUserCancelError,
  redactObject,
} from "../../../common/tools";
import { ErrorHandlerMW } from "../../../core/middleware/errorHandler";
import { PermissionRequestFileProvider } from "../../../core/permissionRequest";
import { SolutionPlugins } from "../../../core/SolutionPluginContainer";
import {
  copyParameterJson,
  deployArmTemplates,
  generateArmTemplate,
  getParameterJson,
} from "./arm";
import {
  checkM365Tenant,
  checkSubscription,
  CommonQuestions,
  createNewResourceGroup,
  fillInCommonQuestions,
} from "./commonQuestions";
import {
  DEFAULT_PERMISSION_REQUEST,
  GLOBAL_CONFIG,
  LOCAL_APPLICATION_ID_URIS,
  LOCAL_CLIENT_SECRET,
  LOCAL_DEBUG_AAD_ID,
  LOCAL_DEBUG_TEAMS_APP_ID,
  PluginNames,
  REMOTE_AAD_ID,
  REMOTE_APPLICATION_ID_URIS,
  REMOTE_CLIENT_SECRET,
  REMOTE_TEAMS_APP_ID,
  SolutionError,
  SolutionTelemetryComponentName,
  SolutionTelemetryEvent,
  SolutionTelemetryProperty,
  SolutionTelemetrySuccess,
  SOLUTION_PROVISION_SUCCEEDED,
  Void,
  SolutionSource,
  SUBSCRIPTION_ID,
  RESOURCE_GROUP_NAME,
  SUBSCRIPTION_NAME,
  LOCAL_TENANT_ID,
  REMOTE_TEAMS_APP_TENANT_ID,
} from "./constants";
import { executeConcurrently, executeLifecycles, LifecyclesWithContext } from "./executor";
import {
  addCapabilityQuestion,
  AskSubscriptionQuestion,
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceSQL,
  AzureResourcesQuestion,
  AzureSolutionQuestionNames,
  BotOptionItem,
  createAddAzureResourceQuestion,
  DeployPluginSelectQuestion,
  HostTypeOptionAzure,
  MessageExtensionItem,
  TabOptionItem,
  TabSPFxItem,
  AzureResourceKeyVault,
  getUserEmailQuestion,
} from "./question";
import {
  getActivatedResourcePlugins,
  getAllResourcePluginMap,
  getAllResourcePlugins,
  ResourcePlugins,
  ResourcePluginsV2,
} from "./ResourcePluginContainer";
import { getPluginContext, sendErrorTelemetryThenReturnError } from "./utils/util";
import {
  canAddCapability,
  canAddResource,
  showUpdateArmTemplateNotice,
  extractParamForRegisterTeamsAppAndAad,
  ParamForRegisterTeamsAppAndAad,
} from "./v2/executeUserTask";
import {
  isAzureProject,
  ensurePermissionRequest,
  parseTeamsAppTenantId,
  fillInSolutionSettings,
  checkWhetherLocalDebugM365TenantMatches,
} from "./v2/utils";
import { grantPermission } from "./v2/grantPermission";
import { checkPermission } from "./v2/checkPermission";
import { listCollaborator } from "./v2/listCollaborator";
import { scaffoldReadme } from "./v2/scaffolding";
import { TelemetryEvent, TelemetryProperty } from "../../../common/telemetry";
import { CopyFileError } from "../../../core/error";
import { isVsCallingCli } from "../../../core/globalVars";
import { AppStudioPlugin } from "../../resource/appstudio";
import { AadAppForTeamsPlugin } from "../../resource/aad";
import { LoadedPlugin, PluginsWithContext, SolutionRunningState } from "./types";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { createCapabilityQuestion } from "../../../core/question";

@Service(SolutionPlugins.AzureTeamsSolution)
export class TeamsAppSolution implements Solution {
  SpfxPlugin: Plugin;
  AppStudioPlugin: AppStudioPlugin;
  BotPlugin: Plugin;
  AadPlugin: Plugin;
  FrontendPlugin: Plugin;
  FunctionPlugin: Plugin;
  SqlPlugin: Plugin;
  ApimPlugin: Plugin;
  KeyVaultPlugin: Plugin;
  LocalDebugPlugin: Plugin;
  CICDPlugin: Plugin;

  name = "fx-solution-azure";

  runningState: SolutionRunningState;

  constructor() {
    this.SpfxPlugin = Container.get<Plugin>(ResourcePlugins.SpfxPlugin);
    this.AppStudioPlugin = Container.get<AppStudioPlugin>(ResourcePlugins.AppStudioPlugin);
    this.BotPlugin = Container.get<Plugin>(ResourcePlugins.BotPlugin);
    this.AadPlugin = Container.get<Plugin>(ResourcePlugins.AadPlugin);
    this.FrontendPlugin = Container.get<Plugin>(ResourcePlugins.FrontendPlugin);
    this.FunctionPlugin = Container.get<Plugin>(ResourcePlugins.FunctionPlugin);
    this.SqlPlugin = Container.get<Plugin>(ResourcePlugins.SqlPlugin);
    this.ApimPlugin = Container.get<Plugin>(ResourcePlugins.ApimPlugin);
    this.KeyVaultPlugin = Container.get<Plugin>(ResourcePlugins.KeyVaultPlugin);
    this.LocalDebugPlugin = Container.get<Plugin>(ResourcePlugins.LocalDebugPlugin);
    this.CICDPlugin = Container.get<Plugin>(ResourcePluginsV2.CICDPlugin);
    this.runningState = SolutionRunningState.Idle;
  }

  private getPluginAndContextArray(
    ctx: SolutionContext,
    selectedPlugins: LoadedPlugin[]
  ): PluginsWithContext[] {
    // let pluginContextConstructor = getPluginContextConstructor(ctx);
    return selectedPlugins.map((plugin) => [plugin, getPluginContext(ctx, plugin.name)]);
  }

  async init(ctx: SolutionContext): Promise<Result<any, FxError>> {
    return ok({});
  }

  assertSettingsNotEmpty<T>(settings: T | undefined, key: string): Result<T, FxError> {
    if (!settings) {
      return err(
        new SystemError(SolutionSource, SolutionError.InternelError, `${key} is undefined`)
      );
    }
    return ok(settings);
  }

  /**
   * create
   */
  async create(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.CreateStart, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
    });
    if (!ctx.projectSettings)
      return err(
        new SystemError(SolutionSource, SolutionError.InternelError, "projectSettings undefined")
      );
    // ensure that global namespace is present
    if (!ctx.envInfo.state.has(GLOBAL_CONFIG)) {
      ctx.envInfo.state.set(GLOBAL_CONFIG, new ConfigMap());
    }

    // Only non-SPFx project will ask this question.
    const lang = ctx.answers![AzureSolutionQuestionNames.ProgrammingLanguage] as string;
    if (lang) {
      ctx.projectSettings!.programmingLanguage = lang;
    }
    const solutionSettings = ctx.projectSettings!.solutionSettings as AzureSolutionSettings;
    const settingsRes = fillInSolutionSettings(ctx.projectSettings, ctx.answers!);
    if (settingsRes.isErr()) {
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.Create,
          settingsRes.error,
          ctx.telemetryReporter
        )
      );
    }

    //Reload plugins according to user answers
    await this.reloadPlugins(solutionSettings);

    if (this.isAzureProject(ctx)) {
      await fs.writeJSON(`${ctx.root}/permissions.json`, DEFAULT_PERMISSION_REQUEST, { spaces: 4 });
      ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.Create, {
        [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
        [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
        [SolutionTelemetryProperty.Resources]: solutionSettings.azureResources.join(";"),
        [SolutionTelemetryProperty.Capabilities]: solutionSettings.capabilities.join(";"),
        [SolutionTelemetryProperty.ProgrammingLanguage]:
          ctx.projectSettings?.programmingLanguage ?? "",
      });
    }
    return ok(Void);
  }

  reloadPlugins(solutionSettings: AzureSolutionSettings): Plugin[] {
    const res = getActivatedResourcePlugins(solutionSettings);
    solutionSettings.activeResourcePlugins = res.map((p) => p.name);
    return res;
  }

  private spfxSelected(ctx: SolutionContext): boolean {
    // Generally, if SPFx is selected, there should be no other plugins. But we don't check this invariant here.
    const spfxExists = this.getAzureSolutionSettings(ctx).activeResourcePlugins.some(
      (pluginName) => pluginName === this.SpfxPlugin.name
    );
    return spfxExists === undefined ? false : spfxExists;
  }

  private isAzureProject(ctx?: SolutionContext): boolean {
    if (!ctx) return true;
    const settings = this.getAzureSolutionSettings(ctx);
    return HostTypeOptionAzure.id === settings.hostType;
  }

  async update(ctx: SolutionContext): Promise<Result<any, FxError>> {
    return await this.executeAddResource(ctx);
  }

  private getSelectedPlugins(ctx: SolutionContext): Result<Plugin[], FxError> {
    const settings = this.getAzureSolutionSettings(ctx);
    const plugins = getActivatedResourcePlugins(settings);
    settings.activeResourcePlugins = plugins.map((p) => p.name);
    return ok(plugins);
  }

  /**
   * scaffold
   */
  @hooks([ErrorHandlerMW])
  async scaffold(ctx: SolutionContext): Promise<Result<any, FxError>> {
    const maybeSelectedPlugins = this.getSelectedPlugins(ctx);
    if (maybeSelectedPlugins.isErr()) {
      return maybeSelectedPlugins;
    }
    const selectedPlugins = maybeSelectedPlugins.value;
    const result = await this.doScaffold(ctx, selectedPlugins, true);
    if (result.isOk()) {
      ctx.ui?.showMessage(
        "info",
        `Success: ${getLocalizedString("core.create.successNotice")}`,
        false
      );
    }
    return result;
  }

  async doScaffold(
    ctx: SolutionContext,
    pluginsToScaffold: LoadedPlugin[],
    generateResourceTemplate: boolean,
    pluginsToDoArm?: LoadedPlugin[]
  ): Promise<Result<any, FxError>> {
    const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(
      ctx,
      pluginsToScaffold
    );
    const preScaffoldWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
      return [plugin?.preScaffold?.bind(plugin), context, plugin.name];
    });
    const scaffoldWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
      return [plugin?.scaffold?.bind(plugin), context, plugin.name];
    });
    const postScaffoldWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
      return [plugin?.postScaffold?.bind(plugin), context, plugin.name];
    });

    const res = await executeLifecycles(preScaffoldWithCtx, scaffoldWithCtx, postScaffoldWithCtx);

    if (res.isOk()) {
      const capabilities = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
        .capabilities;
      const azureResources = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
        .azureResources;

      await scaffoldReadme(capabilities, azureResources, ctx.root);
    }

    if (generateResourceTemplate && this.isAzureProject(ctx)) {
      return await generateArmTemplate(ctx, pluginsToDoArm ? pluginsToDoArm : pluginsToScaffold);
    } else {
      return res;
    }
  }
  async createEnv(ctx: SolutionContext): Promise<Result<any, FxError>> {
    if (isAzureProject(ctx.projectSettings!.solutionSettings as AzureSolutionSettings)) {
      try {
        if (ctx.answers!.copy === true) {
          await copyParameterJson(
            ctx.root,
            ctx.projectSettings!.appName,
            ctx.answers!.targetEnvName!,
            ctx.answers!.sourceEnvName!
          );
        } else {
          await getParameterJson(ctx);
        }
      } catch (e) {
        return err(CopyFileError(e));
      }

      return ok(ctx.answers!.copy ? ctx.answers!.targetEnvName! : ctx.envInfo?.envName);
    }
    return ok(Void);
  }

  /**
   * Checks whether solution's state is idle
   */
  private checkWhetherSolutionIsIdle(): Result<Void, FxError> {
    switch (this.runningState) {
      case SolutionRunningState.Idle:
        return ok(Void);
      case SolutionRunningState.ProvisionInProgress:
        return err(
          new UserError(
            SolutionSource,
            SolutionError.ProvisionInProgress,
            "Provision in progress. Please wait for its completion."
          )
        );
      case SolutionRunningState.DeployInProgress:
        return err(
          new UserError(
            SolutionSource,
            SolutionError.DeploymentInProgress,
            "Deployment in progress. Please wait for its completion."
          )
        );
      case SolutionRunningState.PublishInProgress:
        return err(
          new UserError(
            SolutionSource,
            SolutionError.PublishInProgress,
            "Publish in progress. Please wait for its completion."
          )
        );
    }
  }

  private checkWetherProvisionSucceeded(solutionConfig: SolutionConfig): boolean {
    return !!solutionConfig.get(GLOBAL_CONFIG)?.getBoolean(SOLUTION_PROVISION_SUCCEEDED);
  }

  /**
   * Provision resources. It can only run in a non-SPFx project when solution's running state is Idle.
   * Solution's provisionSucceeded config value will be set to true if provision succeeds, to false otherwise.
   *
   */
  @hooks([ErrorHandlerMW])
  async provision(ctx: SolutionContext): Promise<Result<any, FxError>> {
    const canProvision = this.checkWhetherSolutionIsIdle();
    if (canProvision.isErr()) {
      return canProvision;
    }

    try {
      // Just to trigger M365 login before the concurrent execution of provision.
      // Because concurrent exectution of provision may getAccessToken() concurrently, which
      // causes 2 M365 logins before the token caching in common lib takes effect.
      await ctx.appStudioToken?.getAccessToken();

      this.runningState = SolutionRunningState.ProvisionInProgress;

      if (this.isAzureProject(ctx)) {
        if (ctx.permissionRequestProvider === undefined) {
          ctx.permissionRequestProvider = new PermissionRequestFileProvider(ctx.root);
        }
        const result = await ensurePermissionRequest(
          ctx.projectSettings?.solutionSettings as AzureSolutionSettings,
          ctx.permissionRequestProvider
        );
        if (result.isErr()) {
          return result;
        }
      }

      const provisionResult = await this.doProvision(ctx);
      if (provisionResult.isOk()) {
        const url = getResourceGroupInPortal(
          ctx.envInfo.state.get(GLOBAL_CONFIG)?.getString(SUBSCRIPTION_ID),
          ctx.envInfo.state.get(GLOBAL_CONFIG)?.getString("tenantId"),
          ctx.envInfo.state.get(GLOBAL_CONFIG)?.getString(RESOURCE_GROUP_NAME)
        );
        const msg = getLocalizedString(
          "core.provision.successNotice",
          ctx.projectSettings?.appName
        );
        ctx.logProvider?.info(msg);
        if (url) {
          const title = "View Provisioned Resources";
          ctx.ui?.showMessage("info", msg, false, title).then((result) => {
            const userSelected = result.isOk() ? result.value : undefined;
            if (userSelected === title) {
              ctx.ui!.openUrl(url!);
            }
          });
        } else {
          ctx.ui?.showMessage("info", msg, false);
        }
        ctx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);

        if (!this.isAzureProject(ctx) && isMultiEnvEnabled()) {
          const appStudioTokenJson = await ctx.appStudioToken?.getJsonObject();
          ctx.envInfo.state
            .get(GLOBAL_CONFIG)
            ?.set(REMOTE_TEAMS_APP_TENANT_ID, (appStudioTokenJson as any).tid);
        }
      } else {
        if (
          !isUserCancelError(provisionResult.error) &&
          !isCheckAccountError(provisionResult.error)
        ) {
          const msg = getLocalizedString("core.provision.failNotice", ctx.projectSettings?.appName);
          ctx.logProvider?.error(msg);
          ctx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, false);
        }
      }
      return provisionResult;
    } finally {
      this.runningState = SolutionRunningState.Idle;
    }
  }

  /**
   * provision
   */
  async doProvision(ctx: SolutionContext): Promise<Result<any, FxError>> {
    const maybeSelectedPlugins = this.getSelectedPlugins(ctx);
    if (maybeSelectedPlugins.isErr()) {
      return maybeSelectedPlugins;
    }
    const selectedPlugins = maybeSelectedPlugins.value;

    // Send config telemetry before actually doing anything.
    // If something fails, we can know whether it is related to the config.
    const redactedEnvConfig = redactObject(ctx.envInfo.config, EnvConfigSchema);
    ctx.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.EnvConfig, {
      [TelemetryProperty.Env]: getHashedEnv(ctx.envInfo.envName),
      [TelemetryProperty.EnvConfig]: JSON.stringify(redactedEnvConfig),
    });

    if (this.isAzureProject(ctx)) {
      //1. ask common questions for azure resources.
      const appName = ctx.projectSettings!.appName;
      const res = await fillInCommonQuestions(
        ctx,
        appName,
        ctx.envInfo.state,
        ctx.azureAccountProvider,
        await ctx.appStudioToken?.getJsonObject()
      );
      if (res.isErr()) {
        return res;
      }
      const consentResult = await askForProvisionConsent(ctx);
      if (consentResult.isErr()) {
        return consentResult;
      }

      // create resource group if needed
      const commonQuestionResult = res.value as CommonQuestions;
      if (commonQuestionResult.needCreateResourceGroup) {
        const maybeRgName = await createNewResourceGroup(
          ctx.azureAccountProvider!,
          commonQuestionResult.subscriptionId,
          commonQuestionResult.subscriptionName,
          commonQuestionResult.resourceGroupName,
          commonQuestionResult.location,
          ctx.logProvider
        );

        if (maybeRgName.isErr()) {
          return err(maybeRgName.error);
        }
      }
    }

    const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(
      ctx,
      selectedPlugins
    );
    const preProvisionWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
      return [plugin?.preProvision?.bind(plugin), context, plugin.name];
    });
    const provisionWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
      return [plugin?.provision?.bind(plugin), context, plugin.name];
    });
    const postProvisionWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(
      ([plugin, context]) => {
        return [plugin?.postProvision?.bind(plugin), context, plugin.name];
      }
    );

    return executeLifecycles(
      preProvisionWithCtx,
      provisionWithCtx,
      postProvisionWithCtx,
      async () => {
        ctx.logProvider?.info(
          getLocalizedString("core.provision.StartNotice", PluginDisplayName.Solution)
        );
        return ok(undefined);
      },
      async (provisionResults?: Result<any, FxError>[]) => {
        if (!isMultiEnvEnabled()) {
          if (provisionWithCtx.length === provisionResults?.length) {
            provisionWithCtx.map(function (plugin, index) {
              if (plugin[2] === PluginNames.APPST) {
                const teamsAppResult = provisionResults[index];
                if (teamsAppResult.isOk()) {
                  ctx.envInfo.state
                    .get(GLOBAL_CONFIG)
                    ?.set(REMOTE_TEAMS_APP_ID, teamsAppResult.value);
                }
              }
            });
          }
        }

        if (provisionResults) {
          for (const result of provisionResults) {
            if (result.isErr()) {
              return result;
            }
          }
        }

        if (this.isAzureProject(ctx)) {
          const armDeploymentResult = await deployArmTemplates(ctx);
          if (armDeploymentResult.isErr()) {
            return armDeploymentResult;
          }
        }

        ctx.logProvider?.info(
          getLocalizedString("core.provision.ProvisionFinishNotice", PluginDisplayName.Solution)
        );

        const aadPlugin = this.AadPlugin as AadAppForTeamsPlugin;
        if (selectedPlugins.some((plugin) => plugin.name === aadPlugin.name)) {
          return await aadPlugin.executeUserTask(
            {
              namespace: `${PluginNames.SOLUTION}/${PluginNames.AAD}`,
              method: "setApplicationInContext",
              params: { isLocal: false },
            },
            getPluginContext(ctx, aadPlugin.name)
          );
        }
        return ok(undefined);
      },
      async () => {
        ctx.logProvider?.info(
          getLocalizedString("core.provision.configurationFinishNotice", PluginDisplayName.Solution)
        );
        return ok(undefined);
      }
    );
  }

  @hooks([ErrorHandlerMW])
  async deploy(ctx: SolutionContext): Promise<Result<any, FxError>> {
    const isAzureProject = this.isAzureProject(ctx);
    const provisioned = this.checkWetherProvisionSucceeded(ctx.envInfo.state);
    if (isAzureProject && !provisioned) {
      return err(
        new UserError(
          SolutionSource,
          SolutionError.CannotDeployBeforeProvision,
          getDefaultString("core.NotProvisionedNotice", ctx.projectSettings?.appName),
          getLocalizedString("core.NotProvisionedNotice", ctx.projectSettings?.appName)
        )
      );
    }
    try {
      if (this.isAzureProject(ctx)) {
        // Just to trigger M365 login before the concurrent execution of deploy.
        // Because concurrent exectution of deploy may getAccessToken() concurrently, which
        // causes 2 M365 logins before the token caching in common lib takes effect.
        const appStudioTokenJson = await ctx.appStudioToken?.getJsonObject();

        const checkM365 = await checkM365Tenant(
          { version: 1, data: ctx.envInfo },
          appStudioTokenJson as object
        );
        if (checkM365.isErr()) {
          return checkM365;
        }
        const checkAzure = await checkSubscription(
          { version: 1, data: ctx.envInfo },
          ctx.azureAccountProvider!
        );
        if (checkAzure.isErr()) {
          return checkAzure;
        }
      }

      this.runningState = SolutionRunningState.DeployInProgress;
      const result = await this.doDeploy(ctx);
      if (result.isOk()) {
        if (this.isAzureProject(ctx)) {
          const msg = getLocalizedString("core.deploy.successNotice", ctx.projectSettings?.appName);
          ctx.logProvider?.info(msg);
          ctx.ui?.showMessage("info", msg, false);
        }
      } else {
        const msg = getLocalizedString("core.deploy.failNotice", ctx.projectSettings?.appName);
        ctx.logProvider?.info(msg);
      }

      return result;
    } finally {
      this.runningState = SolutionRunningState.Idle;
    }
  }

  /**
   * deploy
   */
  private async doDeploy(ctx: SolutionContext): Promise<Result<any, FxError>> {
    const res = this.getSelectedPlugins(ctx);
    if (res.isErr()) {
      return res;
    }
    const optionsToDeploy = ctx.answers![
      AzureSolutionQuestionNames.PluginSelectionDeploy
    ] as string[];
    if (optionsToDeploy === undefined || optionsToDeploy.length === 0) {
      return err(
        new UserError(SolutionSource, SolutionError.NoResourcePluginSelected, "No plugin selected")
      );
    }

    const pluginMap = getAllResourcePluginMap();
    const pluginsToDeploy: LoadedPlugin[] = [];
    for (const optionId of optionsToDeploy) {
      const filtered = pluginMap.get(optionId);
      if (filtered && res.value.find((p) => p.name === filtered.name)) {
        pluginsToDeploy.push(filtered);
      }
    }
    ctx.logProvider?.info(
      getLocalizedString(
        "core.deploy.selectedPluginsToDeployNotice",
        PluginDisplayName.Solution,
        JSON.stringify(pluginsToDeploy.map((p) => p.name))
      )
    );
    if (this.isAzureProject(ctx)) {
      //make sure sub is selected
      await ctx.azureAccountProvider?.getSelectedSubscription(true);
    }
    const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(
      ctx,
      pluginsToDeploy
    );
    const preDeployWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
      return [plugin?.preDeploy?.bind(plugin), context, plugin.name];
    });
    const deployWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
      return [plugin?.deploy?.bind(plugin), context, plugin.name];
    });
    const postDeployWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
      return [plugin?.postDeploy?.bind(plugin), context, plugin.name];
    });

    ctx.logProvider?.info(
      getLocalizedString("core.deploy.startNotice", PluginDisplayName.Solution)
    );

    return executeLifecycles(preDeployWithCtx, deployWithCtx, postDeployWithCtx);
  }
  @hooks([ErrorHandlerMW])
  async publish(ctx: SolutionContext): Promise<Result<any, FxError>> {
    const checkRes = this.checkWhetherSolutionIsIdle();
    if (checkRes.isErr()) return err(checkRes.error);
    const isAzureProject = this.isAzureProject(ctx);
    const provisioned = this.checkWetherProvisionSucceeded(ctx.envInfo.state);
    if (!provisioned) {
      return err(
        new UserError(
          SolutionSource,
          SolutionError.CannotPublishBeforeProvision,
          getDefaultString("core.NotProvisionedNotice", ctx.projectSettings?.appName),
          getLocalizedString("core.NotProvisionedNotice", ctx.projectSettings?.appName)
        )
      );
    }

    try {
      const appStudioTokenJson = await ctx.appStudioToken?.getJsonObject();

      const checkM365 = await checkM365Tenant(
        { version: 1, data: ctx.envInfo },
        appStudioTokenJson as object
      );
      if (checkM365.isErr()) {
        return checkM365;
      }

      this.runningState = SolutionRunningState.PublishInProgress;

      const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(ctx, [
        this.AppStudioPlugin,
      ]);
      const publishWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
        return [plugin?.publish?.bind(plugin), context, plugin.name];
      });

      ctx.logProvider?.info(
        getLocalizedString("core.publish.startNotice", PluginDisplayName.Solution)
      );

      const results = await executeConcurrently("", publishWithCtx);

      for (const result of results) {
        if (result.isErr()) {
          const msg = getLocalizedString("core.publish.failNotice", ctx.projectSettings?.appName);
          ctx.logProvider?.info(msg);
          return result;
        }
      }
      return ok(undefined);
    } finally {
      this.runningState = SolutionRunningState.Idle;
    }
  }

  async getTabScaffoldQuestions(
    ctx: SolutionContext,
    addAzureResource: boolean
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const tabNode = new QTreeNode({ type: "group" });

    //Frontend plugin
    const fehostPlugin: Plugin = this.FrontendPlugin;
    if (fehostPlugin.getQuestions) {
      const pluginCtx = getPluginContext(ctx, fehostPlugin.name);
      const res = await fehostPlugin.getQuestions(Stage.create, pluginCtx);
      if (res.isErr()) return res;
      if (res.value) {
        const frontendNode = res.value as QTreeNode;
        if (frontendNode.data) tabNode.addChild(frontendNode);
      }
    }

    if (addAzureResource) {
      const azureResourceNode = new QTreeNode(AzureResourcesQuestion);
      tabNode.addChild(azureResourceNode);
      const functionPlugin: Plugin = this.FunctionPlugin;
      //Azure Function
      if (functionPlugin.getQuestions) {
        const pluginCtx = getPluginContext(ctx, functionPlugin.name);
        const res = await functionPlugin.getQuestions(Stage.create, pluginCtx);
        if (res.isErr()) return res;
        if (res.value) {
          const azure_function = res.value as QTreeNode;
          azure_function.condition = { minItems: 1 };
          if (azure_function.data) azureResourceNode.addChild(azure_function);
        }
      }
      const sqlPlugin: Plugin = this.SqlPlugin;
      //Azure SQL
      if (sqlPlugin.getQuestions) {
        const pluginCtx = getPluginContext(ctx, sqlPlugin.name);
        const res = await sqlPlugin.getQuestions(Stage.create, pluginCtx);
        if (res.isErr()) return res;
        if (res.value) {
          const azure_sql = res.value as QTreeNode;
          azure_sql.condition = { contains: AzureResourceSQL.id };
          if (azure_sql.data) azureResourceNode.addChild(azure_sql);
        }
      }
    }
    return ok(tabNode);
  }

  /**
   * collect solution level question
   * @param ctx
   */
  async getQuestions(
    stage: Stage,
    ctx: SolutionContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const isDynamicQuestion = DynamicPlatforms.includes(ctx.answers!.platform!);
    const node = new QTreeNode({ type: "group" });
    if (stage !== Stage.create && isDynamicQuestion) {
      const checkRes = this.checkWhetherSolutionIsIdle();
      if (checkRes.isErr()) return err(checkRes.error);
    }

    if (stage === Stage.create) {
      // 1. capabilities
      const capQuestion = createCapabilityQuestion();
      const capNode = new QTreeNode(capQuestion);
      node.addChild(capNode);

      // 1.1.1 SPFX Tab
      const spfxPlugin: Plugin = this.SpfxPlugin;
      if (spfxPlugin.getQuestions) {
        const pluginCtx = getPluginContext(ctx, spfxPlugin.name);
        const res = await spfxPlugin.getQuestions(Stage.create, pluginCtx);
        if (res.isErr()) return res;
        if (res.value) {
          const spfxNode = res.value as QTreeNode;
          spfxNode.condition = { contains: TabSPFxItem.id };
          if (spfxNode.data) capNode.addChild(spfxNode);
        }
      }

      // 1.1.2 Azure Tab
      const tabRes = await this.getTabScaffoldQuestions(
        ctx,
        ctx.answers?.platform === Platform.VSCode ? false : true
      );
      if (tabRes.isErr()) return tabRes;
      if (tabRes.value) {
        const tabNode = tabRes.value;
        tabNode.condition = { contains: TabOptionItem.id };
        capNode.addChild(tabNode);
      }

      // 1.2 Bot
      const botPlugin: Plugin = this.BotPlugin;
      if (botPlugin.getQuestions) {
        const pluginCtx = getPluginContext(ctx, botPlugin.name);
        const res = await botPlugin.getQuestions(stage, pluginCtx);
        if (res.isErr()) return res;
        if (res.value) {
          const botGroup = res.value as QTreeNode;
          botGroup.condition = { containsAny: [BotOptionItem.id, MessageExtensionItem.id] };
          capNode.addChild(botGroup);
        }
      }
    } else if (stage === Stage.provision) {
      if (isDynamicQuestion) {
        const provisioned = this.checkWetherProvisionSucceeded(ctx.envInfo.state);
        if (provisioned) return ok(undefined);
      }
      let pluginsToProvision: LoadedPlugin[];
      if (isDynamicQuestion) {
        const res = this.getSelectedPlugins(ctx);
        if (res.isErr()) {
          return err(res.error);
        }
        pluginsToProvision = res.value;
      } else {
        pluginsToProvision = getAllResourcePlugins();
      }
      if (!isDynamicQuestion) {
        node.addChild(new QTreeNode(AskSubscriptionQuestion));
      }
      for (const plugin of pluginsToProvision) {
        if (plugin.getQuestions) {
          const pluginCtx = getPluginContext(ctx, plugin.name);
          const getQuestionRes = await plugin.getQuestions(stage, pluginCtx);
          if (getQuestionRes.isErr()) return getQuestionRes;
          if (getQuestionRes.value) {
            const subnode = getQuestionRes.value as QTreeNode;
            node.addChild(subnode);
          }
        }
      }
    } else if (stage === Stage.deploy) {
      if (isDynamicQuestion) {
        const isAzureProject = this.isAzureProject(ctx);
        const provisioned = this.checkWetherProvisionSucceeded(ctx.envInfo.state);
        if (isAzureProject && !provisioned) {
          return err(
            new UserError({
              source: SolutionSource,
              name: SolutionError.CannotDeployBeforeProvision,
              message: getDefaultString("core.deploy.FailedToDeployBeforeProvision"),
              displayMessage: getLocalizedString("core.deploy.FailedToDeployBeforeProvision"),
              helpLink: HelpLinks.WhyNeedProvision,
            })
          );
        }
      }
      let pluginsToDeploy: LoadedPlugin[];
      if (isDynamicQuestion) {
        const res = this.getSelectedPlugins(ctx);
        if (res.isErr()) {
          return err(
            new UserError(SolutionSource, SolutionError.NoResourceToDeploy, "No resource to deploy")
          );
        }
        pluginsToDeploy = res.value.filter((plugin) => !!plugin.deploy);
      } else {
        const allPlugins = getAllResourcePlugins();
        pluginsToDeploy = allPlugins.filter((plugin) => !!plugin.deploy);
      }

      if (pluginsToDeploy.length === 0) {
        return err(
          new UserError(SolutionSource, SolutionError.NoResourceToDeploy, "No resource to deploy")
        );
      }
      const pluginPrefix = "fx-resource-";
      const options: OptionItem[] = pluginsToDeploy.map((plugin) => {
        const item: OptionItem = {
          id: plugin.name,
          label: plugin.displayName,
          cliName: plugin.name.replace(pluginPrefix, ""),
        };
        return item;
      });

      const selectQuestion = DeployPluginSelectQuestion;
      selectQuestion.staticOptions = options;
      selectQuestion.default = options.map((i) => i.id);
      const pluginSelection = new QTreeNode(selectQuestion);
      node.addChild(pluginSelection);

      for (const plugin of pluginsToDeploy) {
        if (plugin.getQuestions) {
          const pluginCtx = getPluginContext(ctx, plugin.name);
          const getQuestionRes = await plugin.getQuestions(stage, pluginCtx);
          if (getQuestionRes.isErr()) return getQuestionRes;
          if (getQuestionRes.value) {
            const subnode = getQuestionRes.value as QTreeNode;
            subnode.condition = { contains: plugin.name };
            if (subnode.data) pluginSelection.addChild(subnode);
          }
        }
      }
    } else if (stage === Stage.publish) {
      if (isDynamicQuestion) {
        const isAzureProject = this.isAzureProject(ctx);
        const provisioned = this.checkWetherProvisionSucceeded(ctx.envInfo.state);
        if (!provisioned) {
          const errorMsg = isAzureProject
            ? getLocalizedString("core.publish.FailedToPublishBeforeProvision")
            : getLocalizedString("core.publish.SPFxAskProvisionBeforePublish");
          return err(
            new UserError({
              source: SolutionSource,
              name: SolutionError.CannotPublishBeforeProvision,
              message: errorMsg,
              helpLink: HelpLinks.WhyNeedProvision,
            })
          );
        }
      }
      const pluginsToPublish = [this.AppStudioPlugin];
      for (const plugin of pluginsToPublish) {
        const pluginCtx = getPluginContext(ctx, plugin.name);
        if (plugin.getQuestions) {
          const getQuestionRes = await plugin.getQuestions(stage, pluginCtx);
          if (getQuestionRes.isErr()) return getQuestionRes;
          if (getQuestionRes.value) {
            const subnode = getQuestionRes.value as QTreeNode;
            node.addChild(subnode);
          }
        }
      }
    } else if (stage === Stage.grantPermission) {
      if (isDynamicQuestion) {
        const appStudioTokenJson = await ctx.appStudioToken?.getJsonObject();
        node.addChild(new QTreeNode(getUserEmailQuestion((appStudioTokenJson as any)?.upn)));
      }
    }
    return ok(node);
  }

  async localDebug(ctx: SolutionContext): Promise<Result<any, FxError>> {
    try {
      if (!this.spfxSelected(ctx)) {
        if (ctx.permissionRequestProvider === undefined) {
          ctx.permissionRequestProvider = new PermissionRequestFileProvider(ctx.root);
        }
        const result = await ensurePermissionRequest(
          ctx.projectSettings?.solutionSettings as AzureSolutionSettings,
          ctx.permissionRequestProvider
        );
        if (result.isErr()) {
          return result;
        }
      }
    } catch (e) {
      if (e instanceof UserError || e instanceof SystemError) {
        return err(e);
      }
      return err(
        new SystemError(SolutionSource, "UnknownError", "check point 1 - " + JSON.stringify(e))
      );
    }
    return await this.doLocalDebug(ctx);
  }

  async doLocalDebug(ctx: SolutionContext): Promise<Result<any, FxError>> {
    let checkPoint = 1;
    try {
      //check point 2
      const maybeSelectedPlugins = this.getSelectedPlugins(ctx);

      if (maybeSelectedPlugins.isErr()) {
        return maybeSelectedPlugins;
      }
      const selectedPlugins = maybeSelectedPlugins.value;
      checkPoint = 2;

      //check point 3

      // Just to trigger M365 login before the concurrent execution of localDebug.
      // Because concurrent exectution of localDebug may getAccessToken() concurrently, which
      // causes 2 M365 logins before the token caching in common lib takes effect.
      await ctx.appStudioToken?.getAccessToken();

      // Pop-up window to confirm if local debug in another tenant
      const localDebugTenantId = isMultiEnvEnabled()
        ? ctx.localSettings?.teamsApp?.get(LocalSettingsTeamsAppKeys.TenantId)
        : ctx.envInfo.state.get(PluginNames.AAD)?.get(LOCAL_TENANT_ID);
      const m365TenantMatches = await checkWhetherLocalDebugM365TenantMatches(
        localDebugTenantId,
        ctx.appStudioToken,
        ctx.root
      );
      if (m365TenantMatches.isErr()) {
        return m365TenantMatches;
      }

      checkPoint = 3;

      //check point 4
      const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(
        ctx,
        selectedPlugins
      );
      const localDebugWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
        return [plugin?.localDebug?.bind(plugin), context, plugin.name];
      });
      const postLocalDebugWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(
        ([plugin, context]) => {
          return [plugin?.postLocalDebug?.bind(plugin), context, plugin.name];
        }
      );

      const localDebugResults = await executeConcurrently("", localDebugWithCtx);
      for (const localDebugResult of localDebugResults) {
        if (localDebugResult.isErr()) {
          return localDebugResult;
        }
      }
      checkPoint = 4;

      //check point 5
      if (!this.spfxSelected(ctx)) {
        const aadPlugin = this.AadPlugin as AadAppForTeamsPlugin;
        if (selectedPlugins.some((plugin) => plugin.name === aadPlugin.name)) {
          const result = await aadPlugin.executeUserTask(
            {
              namespace: `${PluginNames.SOLUTION}/${PluginNames.AAD}`,
              method: "setApplicationInContext",
              params: { isLocal: true },
            },
            getPluginContext(ctx, aadPlugin.name)
          );
          if (result.isErr()) {
            return result;
          }
        }
      }
      checkPoint = 5;

      // check point 6
      // set local debug Teams app tenant id in context.
      const result = this.loadTeamsAppTenantId(
        ctx,
        true,
        await ctx.appStudioToken?.getJsonObject()
      );
      if (result.isErr()) {
        return result;
      }
      checkPoint = 6;

      //check point 7
      const postLocalDebugResults = await executeConcurrently("post", postLocalDebugWithCtx);

      const combinedPostLocalDebugResults = combine(postLocalDebugResults);
      if (combinedPostLocalDebugResults.isErr()) {
        return combinedPostLocalDebugResults;
      }
      checkPoint = 7;

      //check point 8
      // set local debug Teams app id in context.
      if (postLocalDebugWithCtx.length === combinedPostLocalDebugResults.value.length) {
        postLocalDebugWithCtx.map(function (plugin, index) {
          if (plugin[2] === PluginNames.APPST) {
            if (isMultiEnvEnabled()) {
              ctx.localSettings?.teamsApp?.set(
                LocalSettingsTeamsAppKeys.TeamsAppId,
                combinedPostLocalDebugResults.value[index]
              );
            } else {
              ctx.envInfo.state
                .get(GLOBAL_CONFIG)
                ?.set(LOCAL_DEBUG_TEAMS_APP_ID, combinedPostLocalDebugResults.value[index]);
            }
          }
        });
      }
      checkPoint = 8;
      return ok(Void);
    } catch (e) {
      if (e instanceof UserError || e instanceof SystemError) {
        return err(e);
      }
      return err(
        new SystemError(
          SolutionSource,
          "UnknownError",
          `check point ${checkPoint} - ${JSON.stringify(e)}`
        )
      );
    }
  }

  @hooks([ErrorHandlerMW])
  async grantPermission(ctx: SolutionContext): Promise<Result<PermissionsResult, FxError>> {
    return grantPermission({ apiVersion: 1, ctx });
  }

  @hooks([ErrorHandlerMW])
  async checkPermission(ctx: SolutionContext): Promise<Result<PermissionsResult, FxError>> {
    return checkPermission({ apiVersion: 1, ctx });
  }

  @hooks([ErrorHandlerMW])
  async listCollaborator(ctx: SolutionContext): Promise<Result<ListCollaboratorResult, FxError>> {
    return listCollaborator({ apiVersion: 1, ctx });
  }

  private loadTeamsAppTenantId(
    ctx: SolutionContext,
    isLocalDebug: boolean,
    appStudioToken?: object
  ): Result<SolutionContext, FxError> {
    return parseTeamsAppTenantId(appStudioToken as Record<string, unknown> | undefined).andThen(
      (teamsAppTenantId) => {
        if (isLocalDebug && isMultiEnvEnabled()) {
          ctx.localSettings?.teamsApp?.set(LocalSettingsTeamsAppKeys.TenantId, teamsAppTenantId);
        } else {
          ctx.envInfo.state.get(GLOBAL_CONFIG)?.set("teamsAppTenantId", teamsAppTenantId);
        }

        return ok(ctx);
      }
    );
  }

  getAzureSolutionSettings(ctx: SolutionContext): AzureSolutionSettings {
    return ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
  }

  async getQuestionsForAddResource(
    func: Func,
    ctx: SolutionContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const isDynamicQuestion = DynamicPlatforms.includes(ctx.answers!.platform!);
    const settings = this.getAzureSolutionSettings(ctx);

    if (
      isDynamicQuestion &&
      !(
        settings.hostType === HostTypeOptionAzure.id &&
        settings.capabilities &&
        settings.capabilities.includes(TabOptionItem.id)
      )
    ) {
      return err(
        new UserError(
          SolutionSource,
          SolutionError.AddResourceNotSupport,
          getDefaultString("core.addResource.onlySupportAzure"),
          getLocalizedString("core.addResource.onlySupportAzure")
        )
      );
    }

    const selectedPlugins = settings.activeResourcePlugins || [];

    if (!selectedPlugins) {
      return err(
        new UserError(SolutionSource, SolutionError.InternelError, "selectedPlugins is empty")
      );
    }
    const functionPlugin: Plugin = this.FunctionPlugin;
    const sqlPlugin: Plugin = this.SqlPlugin;
    const apimPlugin: Plugin = this.ApimPlugin;
    const keyVaultPlugin: Plugin = this.KeyVaultPlugin;
    const alreadyHaveFunction = selectedPlugins.includes(functionPlugin.name);
    const alreadyHaveSQL = selectedPlugins.includes(sqlPlugin.name);
    const alreadyHaveAPIM = selectedPlugins.includes(apimPlugin.name);
    const alreadyHavekeyVault = selectedPlugins.includes(keyVaultPlugin.name);

    const addQuestion = createAddAzureResourceQuestion(
      alreadyHaveFunction,
      alreadyHaveSQL,
      alreadyHaveAPIM,
      alreadyHavekeyVault
    );

    const addAzureResourceNode = new QTreeNode(addQuestion);

    // there two cases to add function re-scaffold: 1. select add function   2. select add sql and function is not selected when creating
    if (functionPlugin.getQuestionsForUserTask) {
      const pluginCtx = getPluginContext(ctx, functionPlugin.name);
      const res = await functionPlugin.getQuestionsForUserTask(func, pluginCtx);
      if (res.isErr()) return res;
      if (res.value) {
        const azure_function = res.value as QTreeNode;
        if (alreadyHaveFunction) {
          // if already has function, the question will appear depends on whether user select function, otherwise, the question will always show
          azure_function.condition = { contains: AzureResourceFunction.id };
        } else {
          // if not function activated, select any option will trigger function question
          azure_function.condition = {
            containsAny: [AzureResourceApim.id, AzureResourceFunction.id, AzureResourceSQL.id],
          };
        }
        if (azure_function.data) addAzureResourceNode.addChild(azure_function);
      }
    }

    //Azure SQL
    if (sqlPlugin.getQuestionsForUserTask && !alreadyHaveSQL) {
      const pluginCtx = getPluginContext(ctx, sqlPlugin.name);
      const res = await sqlPlugin.getQuestionsForUserTask(func, pluginCtx);
      if (res.isErr()) return res;
      if (res.value) {
        const azure_sql = res.value as QTreeNode;
        azure_sql.condition = { contains: AzureResourceSQL.id };
        if (azure_sql.data) addAzureResourceNode.addChild(azure_sql);
      }
    }

    //APIM
    if (apimPlugin.getQuestionsForUserTask && (!alreadyHaveAPIM || !isDynamicQuestion)) {
      const pluginCtx = getPluginContext(ctx, apimPlugin.name);
      const res = await apimPlugin.getQuestionsForUserTask(func, pluginCtx);
      if (res.isErr()) return res;
      if (res.value) {
        const apim = res.value as QTreeNode;
        if (apim.data.type !== "group" || (apim.children && apim.children.length > 0)) {
          const groupNode = new QTreeNode({ type: "group" });
          groupNode.condition = { contains: AzureResourceApim.id };
          addAzureResourceNode.addChild(groupNode);
          const funcNode = new QTreeNode(AskSubscriptionQuestion);
          AskSubscriptionQuestion.func = async (
            inputs: Inputs
          ): Promise<Result<SubscriptionInfo, FxError>> => {
            if (!ctx.azureAccountProvider) {
              return err(
                new SystemError(
                  "Solution",
                  SolutionError.InternelError,
                  "azureAccountProvider is undefined"
                )
              );
            }
            const res = await checkSubscription(
              { version: 1, data: ctx.envInfo },
              ctx.azureAccountProvider
            );
            if (res.isOk()) {
              const sub = res.value;
              inputs.subscriptionId = sub.subscriptionId;
              inputs.tenantId = sub.tenantId;
            }
            return res;
          };
          groupNode.addChild(funcNode);
          groupNode.addChild(apim);
        }
      }
    }
    return ok(addAzureResourceNode);
  }

  async getQuestionsForAddCapability(
    ctx: SolutionContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const isDynamicQuestion = DynamicPlatforms.includes(ctx.answers!.platform!);
    const settings = this.getAzureSolutionSettings(ctx);

    if (!(settings.hostType === HostTypeOptionAzure.id) && isDynamicQuestion) {
      return err(
        new UserError(
          SolutionSource,
          SolutionError.AddResourceNotSupport,
          getDefaultString("core.addCapability.onlySupportAzure"),
          getLocalizedString("core.addCapability.onlySupportAzure")
        )
      );
    }

    const capabilities = settings.capabilities || [];

    const alreadyHaveTab = capabilities.includes(TabOptionItem.id);

    const alreadyHaveBotOrMe =
      capabilities.includes(BotOptionItem.id) || capabilities.includes(MessageExtensionItem.id);

    if (alreadyHaveBotOrMe && alreadyHaveTab) {
      const cannotAddCapWarnMsg =
        "Your App already has both Tab and Bot/Messaging extension, can not Add Capability.";
      ctx.ui?.showMessage("error", cannotAddCapWarnMsg, false);
      return ok(undefined);
    }

    const addCapQuestion = addCapabilityQuestion(alreadyHaveTab, alreadyHaveBotOrMe);

    const addCapNode = new QTreeNode(addCapQuestion);

    //Tab sub tree
    if (!alreadyHaveTab || !isDynamicQuestion) {
      const tabRes = await this.getTabScaffoldQuestions(ctx, false);
      if (tabRes.isErr()) return tabRes;
      if (tabRes.value) {
        const tabNode = tabRes.value;
        tabNode.condition = { contains: TabOptionItem.id };
        addCapNode.addChild(tabNode);
      }
    }

    //Bot sub tree
    const botPlugin: Plugin = this.BotPlugin;
    if ((!alreadyHaveBotOrMe || !isDynamicQuestion) && botPlugin.getQuestions) {
      const pluginCtx = getPluginContext(ctx, botPlugin.name);
      const res = await botPlugin.getQuestions(Stage.create, pluginCtx);
      if (res.isErr()) return res;
      if (res.value) {
        const child = res.value as QTreeNode;
        child.condition = { containsAny: [BotOptionItem.id, MessageExtensionItem.id] };
        if (child.data) addCapNode.addChild(child);
      }
    }

    return ok(addCapNode);
  }

  /**
   * user questions for customized task
   */
  async getQuestionsForUserTask(
    func: Func,
    ctx: SolutionContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const isDynamicQuestion = DynamicPlatforms.includes(ctx.answers!.platform!);
    const namespace = func.namespace;
    const array = namespace.split("/");
    if (func.method === "addCapability") {
      return await this.getQuestionsForAddCapability(ctx);
    }
    if (func.method === "addResource") {
      return await this.getQuestionsForAddResource(func, ctx);
    }
    if (array.length == 2) {
      const pluginName = array[1];
      const pluginMap = getAllResourcePluginMap();
      const plugin = pluginMap.get(pluginName);
      if (plugin) {
        if (plugin.getQuestionsForUserTask) {
          const pctx = getPluginContext(ctx, plugin.name);
          return await plugin.getQuestionsForUserTask(func, pctx);
        } else {
          return ok(undefined);
        }
      }
    }
    return ok(undefined);
  }

  async executeAddResource(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.AddResourceStart, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
    });

    if (!ctx.answers) {
      return err(new UserError(SolutionSource, SolutionError.InternelError, "answer is empty!"));
    }
    const settings = this.getAzureSolutionSettings(ctx);
    const originalSettings = deepCopy(settings);
    const canProceed = canAddResource(ctx.projectSettings!, ctx.telemetryReporter!);
    if (canProceed.isErr()) {
      return canProceed;
    }

    const selectedPlugins = settings.activeResourcePlugins;
    const functionPlugin: Plugin = this.FunctionPlugin;
    const sqlPlugin: Plugin = this.SqlPlugin;
    const apimPlugin: Plugin = this.ApimPlugin;
    const keyVaultPlugin: Plugin = this.KeyVaultPlugin;
    const alreadyHaveFunction = selectedPlugins?.includes(functionPlugin.name);
    const alreadyHaveSql = selectedPlugins?.includes(sqlPlugin.name);
    const alreadyHaveApim = selectedPlugins?.includes(apimPlugin.name);
    const alreadyHaveKeyVault = selectedPlugins?.includes(keyVaultPlugin.name);

    const addResourcesAnswer = ctx.answers[AzureSolutionQuestionNames.AddResources] as string[];

    if (!addResourcesAnswer) {
      return err(
        new UserError(
          SolutionSource,
          SolutionError.InvalidInput,
          `answer of ${AzureSolutionQuestionNames.AddResources} is empty!`
        )
      );
    }

    const addSQL = addResourcesAnswer.includes(AzureResourceSQL.id);
    const addFunc = addResourcesAnswer.includes(AzureResourceFunction.id);
    const addApim = addResourcesAnswer.includes(AzureResourceApim.id);
    const addKeyVault = addResourcesAnswer.includes(AzureResourceKeyVault.id);

    if (
      (alreadyHaveSql && addSQL) ||
      (alreadyHaveApim && addApim) ||
      (alreadyHaveKeyVault && addKeyVault)
    ) {
      const e = new UserError(
        SolutionSource,
        SolutionError.AddResourceNotSupport,
        "SQL/APIM/KeyVault is already added."
      );
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.AddResource,
          e,
          ctx.telemetryReporter
        )
      );
    }

    let addNewResourceToProvision = false;
    const notifications: string[] = [];
    const pluginsToScaffold: LoadedPlugin[] = [this.LocalDebugPlugin];
    const pluginsToDoArm: LoadedPlugin[] = [];
    const azureResource = Array.from(settings.azureResources || []);
    if (addFunc || ((addSQL || addApim) && !alreadyHaveFunction)) {
      pluginsToScaffold.push(functionPlugin);
      if (!azureResource.includes(AzureResourceFunction.id)) {
        azureResource.push(AzureResourceFunction.id);
        addNewResourceToProvision = true;
        pluginsToDoArm.push(functionPlugin);
      }
      notifications.push(AzureResourceFunction.label);
    }
    if (addSQL && !alreadyHaveSql) {
      pluginsToScaffold.push(sqlPlugin);
      pluginsToDoArm.push(sqlPlugin);
      azureResource.push(AzureResourceSQL.id);
      notifications.push(AzureResourceSQL.label);
      addNewResourceToProvision = true;
    }
    if (addApim && !alreadyHaveApim) {
      pluginsToScaffold.push(apimPlugin);
      pluginsToDoArm.push(apimPlugin);
      azureResource.push(AzureResourceApim.id);
      notifications.push(AzureResourceApim.label);
      addNewResourceToProvision = true;
    }
    if (addKeyVault && !alreadyHaveKeyVault) {
      pluginsToScaffold.push(keyVaultPlugin);
      pluginsToDoArm.push(keyVaultPlugin);
      azureResource.push(AzureResourceKeyVault.id);
      notifications.push(AzureResourceKeyVault.label);
      addNewResourceToProvision = true;
    }

    if (notifications.length > 0) {
      if (addNewResourceToProvision) {
        showUpdateArmTemplateNotice(ctx.ui);
      }
      settings.azureResources = azureResource;
      await this.reloadPlugins(settings);
      ctx.logProvider?.info(`start scaffolding ${notifications.join(",")}.....`);
      const scaffoldRes = await this.doScaffold(
        ctx,
        pluginsToScaffold,
        addNewResourceToProvision,
        pluginsToDoArm
      );
      if (scaffoldRes.isErr()) {
        ctx.logProvider?.info(`failed to scaffold ${notifications.join(",")}!`);
        ctx.projectSettings!.solutionSettings = originalSettings;
        return err(
          sendErrorTelemetryThenReturnError(
            SolutionTelemetryEvent.AddResource,
            scaffoldRes.error,
            ctx.telemetryReporter
          )
        );
      }
      ctx.logProvider?.info(`finish scaffolding ${notifications.join(",")}!`);
      if (addNewResourceToProvision)
        ctx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, false); //if selected plugin changed, we need to re-do provision
      ctx.ui?.showMessage(
        "info",
        util.format(
          ctx.answers.platform === Platform.CLI
            ? getLocalizedString("core.addResource.addResourceNoticeForCli")
            : getLocalizedString("core.addResource.addResourceNotice"),
          notifications.join(",")
        ),
        false
      );
    }

    ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.AddResource, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
      [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
      [SolutionTelemetryProperty.Resources]: addResourcesAnswer.join(";"),
    });
    return ok(Void);
  }

  async executeAddCapability(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.AddCapabilityStart, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
    });
    if (!ctx.answers) {
      return err(new UserError(SolutionSource, SolutionError.InternelError, "answer is empty!"));
    }
    const settings = this.getAzureSolutionSettings(ctx);
    const originalSettings = deepCopy(settings);
    const canProceed = canAddCapability(settings, ctx.telemetryReporter!);
    if (canProceed.isErr()) {
      return canProceed;
    }

    const capabilitiesAnswer = ctx.answers[AzureSolutionQuestionNames.Capabilities] as string[];
    if (!capabilitiesAnswer || capabilitiesAnswer.length === 0) {
      ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.AddCapability, {
        [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
        [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
        [SolutionTelemetryProperty.Capabilities]: [].join(";"),
      });
      return ok(Void);
    }
    const alreadyHaveBotAndAddBot =
      (settings.capabilities?.includes(BotOptionItem.id) ||
        settings.capabilities?.includes(MessageExtensionItem.id)) &&
      (capabilitiesAnswer.includes(BotOptionItem.id) ||
        capabilitiesAnswer.includes(MessageExtensionItem.id));
    const alreadyHaveTabAndAddTab =
      settings.capabilities?.includes(TabOptionItem.id) &&
      capabilitiesAnswer.includes(TabOptionItem.id);
    if (alreadyHaveBotAndAddBot || alreadyHaveTabAndAddTab) {
      const e = new UserError(
        SolutionSource,
        SolutionError.FailedToAddCapability,
        "There are no additional capabilities you can add to your project."
      );
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.AddCapability,
          e,
          ctx.telemetryReporter
        )
      );
    }
    let change = false;
    const pluginsToScaffold: LoadedPlugin[] = [this.LocalDebugPlugin, this.AppStudioPlugin];
    const capabilities = Array.from(settings.capabilities);
    for (const cap of capabilitiesAnswer!) {
      if (!capabilities.includes(cap)) {
        capabilities.push(cap);
        change = true;
        if (cap === TabOptionItem.id) {
          pluginsToScaffold.push(this.FrontendPlugin);
          pluginsToScaffold.push(Container.get<Plugin>(ResourcePlugins.SimpleAuthPlugin));
        } else if (
          (cap === BotOptionItem.id || cap === MessageExtensionItem.id) &&
          !pluginsToScaffold.includes(this.BotPlugin)
        ) {
          pluginsToScaffold.push(this.BotPlugin);
        }
      }
    }

    if (change) {
      showUpdateArmTemplateNotice(ctx.ui);

      settings.capabilities = capabilities;
      await this.reloadPlugins(settings);
      const pluginNames = pluginsToScaffold.map((p) => p.name).join(",");
      ctx.logProvider?.info(`start scaffolding ${pluginNames}.....`);
      const scaffoldRes = await this.doScaffold(ctx, pluginsToScaffold, true);
      if (scaffoldRes.isErr()) {
        ctx.logProvider?.info(`failed to scaffold ${pluginNames}!`);
        ctx.projectSettings!.solutionSettings = originalSettings;
        return err(
          sendErrorTelemetryThenReturnError(
            SolutionTelemetryEvent.AddCapability,
            scaffoldRes.error,
            ctx.telemetryReporter
          )
        );
      }
      ctx.logProvider?.info(`finish scaffolding ${pluginNames}!`);
      ctx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, false);
      const addNames = capabilitiesAnswer.map((c) => `'${c}'`).join(" and ");
      const single = capabilitiesAnswer.length === 1;
      const template =
        ctx.answers.platform === Platform.CLI
          ? single
            ? getLocalizedString("core.addCapability.addCapabilityNoticeForCli")
            : getLocalizedString("core.addCapability.addCapabilitiesNoticeForCli")
          : single
          ? getLocalizedString("core.addCapability.addCapabilityNotice")
          : getLocalizedString("core.addCapability.addCapabilitiesNotice");
      const msg = util.format(template, addNames);
      ctx.ui?.showMessage("info", msg, false);

      ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.AddCapability, {
        [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
        [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
        [SolutionTelemetryProperty.Capabilities]: capabilitiesAnswer.join(";"),
      });
      return ok({});
    }
    const cannotAddCapWarnMsg = "Add nothing";
    ctx.ui?.showMessage("warn", cannotAddCapWarnMsg, false);
    ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.AddCapability, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
      [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
      [SolutionTelemetryProperty.Capabilities]: [].join(";"),
    });
    return ok({});
  }
  /**
   * execute user task
   */
  @hooks([ErrorHandlerMW])
  async executeUserTask(func: Func, ctx: SolutionContext): Promise<Result<any, FxError>> {
    if (!ctx.answers)
      return err(new UserError(SolutionSource, SolutionError.InternelError, "answer is empty!"));
    const namespace = func.namespace;
    const method = func.method;
    const array = namespace.split("/");
    if (method === "addCapability") {
      return this.executeAddCapability(ctx!);
    }
    if (method === "addResource") {
      return this.executeAddResource(ctx);
    }
    if (namespace.includes("solution")) {
      if (method === "registerTeamsAppAndAad") {
        const maybeParams = extractParamForRegisterTeamsAppAndAad(ctx.answers);
        if (maybeParams.isErr()) {
          return maybeParams;
        }
        return this.registerTeamsAppAndAad(ctx, maybeParams.value);
      } else if (method === "VSpublish") {
        // VSpublish means VS calling cli to do publish. It is different than normal cli work flow
        // It's teamsfx init followed by teamsfx  publish without running provision.
        // Using executeUserTask here could bypass the fx project check.
        if (ctx.answers?.platform !== "vs") {
          return err(
            new SystemError(
              SolutionSource,
              SolutionError.UnsupportedPlatform,
              getDefaultString("error.UnsupportedPlatformVS"),
              getLocalizedString("error.UnsupportedPlatformVS")
            )
          );
        }
        const appStudioPlugin = this.AppStudioPlugin as AppStudioPlugin;
        const pluginCtx = getPluginContext(ctx, appStudioPlugin.name);
        return appStudioPlugin.publish(pluginCtx);
      } else if (method === "validateManifest") {
        const appStudioPlugin = this.AppStudioPlugin as AppStudioPlugin;
        const pluginCtx = getPluginContext(ctx, appStudioPlugin.name);
        return await appStudioPlugin.executeUserTask(func, pluginCtx);
      } else if (method === "buildPackage") {
        const appStudioPlugin = this.AppStudioPlugin as AppStudioPlugin;
        const pluginCtx = getPluginContext(ctx, appStudioPlugin.name);
        return await appStudioPlugin.executeUserTask(func, pluginCtx);
      } else if (array.length == 2) {
        const pluginName = array[1];
        const pluginMap = getAllResourcePluginMap();
        const plugin = pluginMap.get(pluginName);
        if (plugin && plugin.executeUserTask) {
          const pctx = getPluginContext(ctx, plugin.name);
          return plugin.executeUserTask(func, pctx);
        }
      }
    }

    return err(
      new UserError(
        SolutionSource,
        `executeUserTaskRouteFailed`,
        getDefaultString("error.appstudio.executeUserTaskRouteFailed", JSON.stringify(func)),
        getLocalizedString("error.appstudio.executeUserTaskRouteFailed", JSON.stringify(func))
      )
    );
  }

  private prepareConfigForRegisterTeamsAppAndAad(
    config: SolutionConfig,
    params: ParamForRegisterTeamsAppAndAad
  ): string {
    const endpoint = params.endpoint;
    const domain = new URL(endpoint).hostname;

    if (config.get(GLOBAL_CONFIG) == undefined) {
      config.set(GLOBAL_CONFIG, new ConfigMap());
    }

    const aadPlugin = this.AadPlugin;
    if (config.get(aadPlugin.name) == undefined) {
      config.set(aadPlugin.name, new ConfigMap());
    }
    config.get(aadPlugin.name)!.set("domain", domain);
    config.get(aadPlugin.name)!.set("endpoint", endpoint);
    return domain;
  }

  private extractConfigForRegisterTeamsAppAndAad(
    config: SolutionConfig,
    isLocal: boolean
  ): Result<{ aadId: string; applicationIdUri: string; clientSecret: string }, FxError> {
    const aadPlugin = this.AadPlugin;
    const aadId = config.get(aadPlugin.name)?.get(isLocal ? LOCAL_DEBUG_AAD_ID : REMOTE_AAD_ID);
    if (aadId === undefined || typeof aadId !== "string") {
      return err(
        new SystemError(
          SolutionSource,
          SolutionError.RegisterTeamsAppAndAadError,
          `config ${LOCAL_DEBUG_AAD_ID} is missing`
        )
      );
    }
    const applicationIdUri = config
      .get(aadPlugin.name)
      ?.get(isLocal ? LOCAL_APPLICATION_ID_URIS : REMOTE_APPLICATION_ID_URIS);
    if (applicationIdUri === undefined || typeof applicationIdUri !== "string") {
      return err(
        new SystemError(
          SolutionSource,
          SolutionError.RegisterTeamsAppAndAadError,
          `config ${LOCAL_APPLICATION_ID_URIS} is missing`
        )
      );
    }
    const clientSecret = config
      .get(aadPlugin.name)
      ?.get(isLocal ? LOCAL_CLIENT_SECRET : REMOTE_CLIENT_SECRET);
    if (clientSecret === undefined || typeof clientSecret !== "string") {
      return err(
        new SystemError(
          SolutionSource,
          SolutionError.RegisterTeamsAppAndAadError,
          `config ${LOCAL_CLIENT_SECRET} is missing`
        )
      );
    }
    return ok({
      aadId,
      applicationIdUri,
      clientSecret,
    });
  }

  /**
   * This function is only called by cli: teamsfx init. The context may be different from that of vsc: no .${ConfigFolderName} folder, no permissions.json
   * In order to reuse aad plugin, we need to pretend we are still in vsc context. Currently, we don't support icons, because icons are not included in the
   * current contract.
   */
  private async registerTeamsAppAndAad(
    ctx: SolutionContext,
    params: ParamForRegisterTeamsAppAndAad
  ): Promise<
    Result<
      {
        teamsAppId: string;
        clientId: string;
        clientSecret: string;
        tenantId: string;
        applicationIdUri: string;
      },
      FxError
    >
  > {
    const rootPath = params["root-path"];
    const isLocal: boolean = params.environment === "local";
    const mockedManifest = new TeamsAppManifest();
    mockedManifest.name.short = params["app-name"];
    const domain = this.prepareConfigForRegisterTeamsAppAndAad(ctx.envInfo.state, params);
    const aadPlugin = this.AadPlugin as AadAppForTeamsPlugin;
    const aadPluginCtx = getPluginContext(ctx, aadPlugin.name);

    if (ctx.permissionRequestProvider === undefined) {
      ctx.permissionRequestProvider = {
        async checkPermissionRequest(): Promise<Result<undefined, FxError>> {
          return ok(undefined);
        },
        async getPermissionRequest(): Promise<Result<string, FxError>> {
          return ok(JSON.stringify(DEFAULT_PERMISSION_REQUEST));
        },
      };
    }

    const provisionResult = isLocal
      ? await aadPlugin.localDebug(aadPluginCtx)
      : await aadPlugin.provision(aadPluginCtx);
    if (provisionResult.isErr()) {
      return provisionResult;
    }
    await aadPlugin.executeUserTask(
      {
        namespace: `${PluginNames.SOLUTION}/${PluginNames.AAD}`,
        method: "setApplicationInContext",
        params: { isLocal: isLocal },
      },
      aadPluginCtx
    );
    const postProvisionResult = isLocal
      ? await aadPlugin.postLocalDebug(aadPluginCtx)
      : await aadPlugin.postProvision(aadPluginCtx);
    if (postProvisionResult.isErr()) {
      return postProvisionResult;
    }

    const configResult = this.extractConfigForRegisterTeamsAppAndAad(ctx.envInfo.state, isLocal);
    if (configResult.isErr()) {
      return err(configResult.error);
    }

    const manifestPath: string = path.join(
      rootPath,
      "manifest",
      isLocal ? "local" : "remote",
      "manifest.json"
    );
    const appSettingsJSONPath = path.join(
      rootPath,
      isLocal ? "appsettings.Development.json" : "appsettings.json"
    );

    const manifestTpl = (await fs.readFile(manifestPath)).toString();
    const manifestStr: string = Mustache.render(manifestTpl, {
      "client-id": configResult.value.aadId,
      "app-name": params["app-name"],
      endpoint: params.endpoint,
      domain: domain,
      "application-id-uri": configResult.value.applicationIdUri,
    });
    const manifest: TeamsAppManifest = JSON.parse(manifestStr);
    await fs.writeFile(manifestPath, manifestStr);
    const appStudioPlugin: AppStudioPlugin = this.AppStudioPlugin as any;
    const func: Func = {
      namespace: `${PluginNames.SOLUTION}/${PluginNames.APPST}`,
      method: "getAppDefinitionAndUpdate",
      params: {
        type: "remote",
        manifest: manifest,
      },
    };
    const maybeTeamsAppId = await appStudioPlugin.executeUserTask(
      func,
      getPluginContext(ctx, this.AppStudioPlugin.name)
    );
    if (maybeTeamsAppId.isErr()) {
      return err(maybeTeamsAppId.error);
    }
    const teamsAppId = maybeTeamsAppId.value;

    const appSettingsJSONTpl = (await fs.readFile(appSettingsJSONPath)).toString();
    const maybeTenantId = parseTeamsAppTenantId(await ctx.appStudioToken?.getJsonObject());
    if (maybeTenantId.isErr()) {
      return err(maybeTenantId.error);
    }
    const appSettingsJSON = Mustache.render(appSettingsJSONTpl, {
      "client-id": configResult.value.aadId,
      "client-secret": configResult.value.clientSecret,
      "application-id-uri": configResult.value.applicationIdUri,
      endpoint: params.endpoint,
      "tenant-id": maybeTenantId.value,
    });
    await fs.writeFile(appSettingsJSONPath, appSettingsJSON);

    if (isLocal) {
      const launchSettingsJSONPath: string = path.join(
        rootPath,
        "Properties",
        "launchSettings.json"
      );
      const launchSettingsJSONTpl = (await fs.readFile(launchSettingsJSONPath)).toString();
      const launchSettingsJSON = Mustache.render(launchSettingsJSONTpl, {
        "teams-app-id": teamsAppId,
      });
      await fs.writeFile(launchSettingsJSONPath, launchSettingsJSON);
    }

    return ok({
      teamsAppId: teamsAppId,
      clientId: configResult.value.aadId,
      clientSecret: configResult.value.clientSecret,
      tenantId: maybeTenantId.value,
      applicationIdUri: configResult.value.applicationIdUri,
    });
  }
}

export async function askForProvisionConsent(ctx: SolutionContext): Promise<Result<Void, FxError>> {
  if (isVsCallingCli()) {
    // Skip asking users for input on VS calling CLI to simplify user interaction.
    return ok(Void);
  }

  const azureToken = await ctx.azureAccountProvider?.getAccountCredentialAsync();

  // Only Azure project requires this confirm dialog
  const username = (azureToken as any).username ? (azureToken as any).username : "";
  const subscriptionId = ctx.envInfo.state.get(GLOBAL_CONFIG)?.get(SUBSCRIPTION_ID) as string;
  const subscriptionName = ctx.envInfo.state.get(GLOBAL_CONFIG)?.get(SUBSCRIPTION_NAME) as string;
  const msg = getLocalizedString(
    "core.provision.confirmNotice",
    username,
    subscriptionName ? subscriptionName : subscriptionId
  );
  let confirmRes = undefined;
  if (isMultiEnvEnabled()) {
    const msgNew = getLocalizedString(
      "core.provision.confirmEnvNotice",
      ctx.envInfo.envName,
      username,
      subscriptionName ? subscriptionName : subscriptionId
    );
    confirmRes = await ctx.ui?.showMessage("warn", msgNew, true, "Provision");
  } else {
    confirmRes = await ctx.ui?.showMessage("warn", msg, true, "Provision", "Pricing calculator");
  }

  const confirm = confirmRes?.isOk() ? confirmRes.value : undefined;

  if (confirm !== "Provision") {
    if (confirm === "Pricing calculator") {
      ctx.ui?.openUrl("https://azure.microsoft.com/en-us/pricing/calculator/");
    }

    return err(new UserError(SolutionSource, "CancelProvision", "CancelProvision"));
  }

  return ok(Void);
}
