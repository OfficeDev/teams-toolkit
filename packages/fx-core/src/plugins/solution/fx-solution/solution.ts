/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { hooks } from "@feathersjs/hooks/lib";
import {
  ArchiveFolderName,
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
  PluginContext,
  ProjectSettings,
  QTreeNode,
  Result,
  returnSystemError,
  returnUserError,
  Solution,
  SolutionConfig,
  SolutionContext,
  SolutionSettings,
  Stage,
  SubscriptionInfo,
  SystemError,
  TeamsAppManifest,
  UserError,
} from "@microsoft/teamsfx-api";
import axios from "axios";
import * as fs from "fs-extra";
import Mustache from "mustache";
import path from "path";
import { Container, Service } from "typedi";
import * as util from "util";
import { PluginDisplayName } from "../../../common/constants";
import { LocalSettingsTeamsAppKeys } from "../../../common/localSettingsConstants";
import { ListCollaboratorResult, PermissionsResult } from "../../../common/permissionInterface";
import {
  deepCopy,
  getHashedEnv,
  getResourceGroupInPortal,
  getStrings,
  isArmSupportEnabled,
  isCheckAccountError,
  isMultiEnvEnabled,
  isUserCancelError,
  redactObject,
} from "../../../common/tools";
import { CopyFileError } from "../../../core";
import { ErrorHandlerMW } from "../../../core/middleware/errorHandler";
import { PermissionRequestFileProvider } from "../../../core/permissionRequest";
import { SolutionPlugins } from "../../../core/SolutionPluginContainer";
import { AadAppForTeamsPlugin, AppStudioPlugin, SpfxPlugin } from "../../resource";
import { IUserList } from "../../resource/appstudio/interfaces/IAppDefinition";
import {
  copyParameterJson,
  deployArmTemplates,
  generateArmTemplate,
  getParameterJson,
} from "./arm";
import { checkM365Tenant, checkSubscription, fillInCommonQuestions } from "./commonQuestions";
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
  createCapabilityQuestion,
  createV1CapabilityQuestion,
  DeployPluginSelectQuestion,
  HostTypeOptionAzure,
  MessageExtensionItem,
  ProgrammingLanguageQuestion,
  TabOptionItem,
  GetUserEmailQuestion,
  TabSPFxItem,
  AzureResourceKeyVault,
} from "./question";
import {
  getActivatedResourcePlugins,
  getAllResourcePluginMap,
  getAllResourcePlugins,
  ResourcePlugins,
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
  parseUserName,
} from "./v2/utils";
import { askForProvisionConsent } from "./v2/provision";
import { grantPermission } from "./v2/grantPermission";
import { checkPermission } from "./v2/checkPermission";
import { listAllCollaborators } from "./v2/listAllCollaborators";
import { listCollaborator } from "./v2/listCollaborator";
import { scaffoldReadme } from "./v2/scaffolding";
import { TelemetryEvent, TelemetryProperty } from "../../../common/telemetry";
import { LOCAL_TENANT_ID, REMOTE_TEAMS_APP_TENANT_ID } from ".";
import { HelpLinks } from "../../../common/constants";

export type LoadedPlugin = Plugin;
export type PluginsWithContext = [LoadedPlugin, PluginContext];

// Maybe we need a state machine to track state transition.
export enum SolutionRunningState {
  Idle = "idle",
  ProvisionInProgress = "ProvisionInProgress",
  DeployInProgress = "DeployInProgress",
  PublishInProgress = "PublishInProgress",
}

@Service(SolutionPlugins.AzureTeamsSolution)
export class TeamsAppSolution implements Solution {
  SpfxPlugin: SpfxPlugin;
  AppStudioPlugin: AppStudioPlugin;
  BotPlugin: Plugin;
  AadPlugin: Plugin;
  FrontendPlugin: Plugin;
  FunctionPlugin: Plugin;
  SqlPlugin: Plugin;
  ApimPlugin: Plugin;
  KeyVaultPlugin: Plugin;
  LocalDebugPlugin: Plugin;

  name = "fx-solution-azure";

  runningState: SolutionRunningState;

  constructor() {
    this.SpfxPlugin = Container.get<SpfxPlugin>(ResourcePlugins.SpfxPlugin);
    this.AppStudioPlugin = Container.get<AppStudioPlugin>(ResourcePlugins.AppStudioPlugin);
    this.BotPlugin = Container.get<Plugin>(ResourcePlugins.BotPlugin);
    this.AadPlugin = Container.get<Plugin>(ResourcePlugins.AadPlugin);
    this.FrontendPlugin = Container.get<Plugin>(ResourcePlugins.FrontendPlugin);
    this.FunctionPlugin = Container.get<Plugin>(ResourcePlugins.FunctionPlugin);
    this.SqlPlugin = Container.get<Plugin>(ResourcePlugins.SqlPlugin);
    this.ApimPlugin = Container.get<Plugin>(ResourcePlugins.ApimPlugin);
    this.KeyVaultPlugin = Container.get<Plugin>(ResourcePlugins.KeyVaultPlugin);
    this.LocalDebugPlugin = Container.get<Plugin>(ResourcePlugins.LocalDebugPlugin);
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
        returnSystemError(
          new Error(`${key} is undefined`),
          SolutionSource,
          SolutionError.InternelError
        )
      );
    }
    return ok(settings);
  }

  async fillInV1SolutionSettings(
    ctx: SolutionContext
  ): Promise<Result<AzureSolutionSettings, FxError>> {
    const assertList: [
      Result<Inputs, FxError>,
      Result<ProjectSettings, FxError>,
      Result<SolutionSettings, FxError>
    ] = [
      this.assertSettingsNotEmpty<Inputs>(ctx.answers, "answers"),
      this.assertSettingsNotEmpty<ProjectSettings>(ctx.projectSettings, "projectSettings"),
      this.assertSettingsNotEmpty<SolutionSettings>(
        ctx?.projectSettings?.solutionSettings,
        "solutionSettings"
      ),
    ];
    const assertRes = combine(assertList);
    if (assertRes.isErr()) {
      return err(assertRes.error);
    }
    const [answers, projectSettings, solutionSettingsSource] = assertRes.value;

    const isTypescriptProject = await fs.pathExists(
      path.join(ctx.root, ArchiveFolderName, "tsconfig.json")
    );
    projectSettings.programmingLanguage = isTypescriptProject ? "typescript" : "javascript";

    const capability = answers[AzureSolutionQuestionNames.V1Capability] as string;
    if (!capability) {
      return err(
        returnSystemError(
          new Error("capabilities is empty"),
          SolutionSource,
          SolutionError.InternelError
        )
      );
    }

    const solutionSettings: AzureSolutionSettings = {
      name: solutionSettingsSource.name,
      version: solutionSettingsSource.version,
      hostType: HostTypeOptionAzure.id,
      capabilities: [capability],
      azureResources: [],
      activeResourcePlugins: [],
      migrateFromV1: solutionSettingsSource?.migrateFromV1,
    };
    projectSettings.solutionSettings = solutionSettings;
    return ok(solutionSettings);
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
        new SystemError(SolutionError.InternelError, "projectSettings undefined", SolutionSource)
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
    const settingsRes = fillInSolutionSettings(solutionSettings, ctx.answers!);
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

  // Migrate
  async migrate(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.MigrateStart, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
    });

    // ensure that global namespace is present
    if (!ctx.envInfo.state.has(GLOBAL_CONFIG)) {
      ctx.envInfo.state.set(GLOBAL_CONFIG, new ConfigMap());
    }

    const settingsRes = await this.fillInV1SolutionSettings(ctx);
    if (settingsRes.isErr()) {
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.Migrate,
          settingsRes.error,
          ctx.telemetryReporter
        )
      );
    }

    const solutionSettings = settingsRes.value;
    const selectedPlugins = await this.reloadPlugins(solutionSettings);

    const results: Result<any, FxError>[] = await Promise.all<Result<any, FxError>>(
      selectedPlugins.map<Promise<Result<any, FxError>>>((migratePlugin) => {
        return this.executeUserTask(
          {
            namespace: `${PluginNames.SOLUTION}/${migratePlugin.name}`,
            method: "migrateV1Project",
            params: {},
          },
          ctx
        );
      })
    );

    const errorResult = results.find((result) => {
      return result.isErr();
    });

    if (errorResult) {
      return errorResult;
    }

    const capabilities = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      .capabilities;
    const azureResources = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      .azureResources;
    await scaffoldReadme(capabilities, azureResources, ctx.root, true);

    ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.Migrate, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
      [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
    });

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
      ctx.ui?.showMessage("info", `Success: ${getStrings().solution.ScaffoldSuccessNotice}`, false);
    }
    return result;
  }

  async doScaffold(
    ctx: SolutionContext,
    selectedPlugins: LoadedPlugin[],
    generateResourceTemplate: boolean
  ): Promise<Result<any, FxError>> {
    const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(
      ctx,
      selectedPlugins
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

    if (isArmSupportEnabled() && generateResourceTemplate && this.isAzureProject(ctx)) {
      return await generateArmTemplate(ctx, selectedPlugins);
    } else {
      return res;
    }
  }
  async createEnv(ctx: SolutionContext): Promise<Result<any, FxError>> {
    if (
      isArmSupportEnabled() &&
      isAzureProject(ctx.projectSettings!.solutionSettings as AzureSolutionSettings)
    ) {
      try {
        if (ctx.answers!.copy === true) {
          await copyParameterJson(ctx, ctx.answers!.targetEnvName!, ctx.answers!.sourceEnvName!);
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
          returnUserError(
            new Error("Provision in progress. Please wait for its completion."),
            SolutionSource,
            SolutionError.ProvisionInProgress
          )
        );
      case SolutionRunningState.DeployInProgress:
        return err(
          returnUserError(
            new Error("Deployment in progress. Please wait for its completion."),
            SolutionSource,
            SolutionError.DeploymentInProgress
          )
        );
      case SolutionRunningState.PublishInProgress:
        return err(
          returnUserError(
            new Error("Publish in progress. Please wait for its completion."),
            SolutionSource,
            SolutionError.PublishInProgress
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
        const msg = util.format(
          `Success: ${getStrings().solution.ProvisionSuccessNotice}`,
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
          const msg = util.format(
            getStrings().solution.ProvisionFailNotice,
            ctx.projectSettings?.appName
          );
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
          util.format(getStrings().solution.ProvisionStartNotice, PluginDisplayName.Solution)
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

        if (isArmSupportEnabled() && this.isAzureProject(ctx)) {
          const armDeploymentResult = await deployArmTemplates(ctx);
          if (armDeploymentResult.isErr()) {
            return armDeploymentResult;
          }
        }

        ctx.logProvider?.info(
          util.format(getStrings().solution.ProvisionFinishNotice, PluginDisplayName.Solution)
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
          util.format(getStrings().solution.ConfigurationFinishNotice, PluginDisplayName.Solution)
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
        returnUserError(
          new Error(
            util.format(getStrings().solution.NotProvisionedNotice, ctx.projectSettings?.appName)
          ),
          SolutionSource,
          SolutionError.CannotDeployBeforeProvision
        )
      );
    }
    try {
      if (this.isAzureProject(ctx)) {
        // Just to trigger M365 login before the concurrent execution of deploy.
        // Because concurrent exectution of deploy may getAccessToken() concurrently, which
        // causes 2 M365 logins before the token caching in common lib takes effect.
        const appStudioTokenJson = await ctx.appStudioToken?.getJsonObject();

        const checkM365 = await checkM365Tenant(ctx.envInfo, appStudioTokenJson as object);
        if (checkM365.isErr()) {
          return checkM365;
        }
        const checkAzure = await checkSubscription(ctx.envInfo, ctx.azureAccountProvider!);
        if (checkAzure.isErr()) {
          return checkAzure;
        }
      }

      this.runningState = SolutionRunningState.DeployInProgress;
      const result = await this.doDeploy(ctx);
      if (result.isOk()) {
        if (this.isAzureProject(ctx)) {
          const msg = util.format(
            `Success: ${getStrings().solution.DeploySuccessNotice}`,
            ctx.projectSettings?.appName
          );
          ctx.logProvider?.info(msg);
          ctx.ui?.showMessage("info", msg, false);
        }
      } else {
        const msg = util.format(
          getStrings().solution.DeployFailNotice,
          ctx.projectSettings?.appName
        );
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
        returnUserError(
          new Error(`No plugin selected`),
          SolutionSource,
          SolutionError.NoResourcePluginSelected
        )
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
      util.format(
        getStrings().solution.SelectedPluginsToDeployNotice,
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
      util.format(getStrings().solution.DeployStartNotice, PluginDisplayName.Solution)
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
        returnUserError(
          new Error(
            util.format(getStrings().solution.NotProvisionedNotice, ctx.projectSettings?.appName)
          ),
          SolutionSource,
          SolutionError.CannotPublishBeforeProvision
        )
      );
    }

    try {
      const appStudioTokenJson = await ctx.appStudioToken?.getJsonObject();

      const checkM365 = await checkM365Tenant(ctx.envInfo, appStudioTokenJson as object);
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
        util.format(getStrings().solution.PublishStartNotice, PluginDisplayName.Solution)
      );

      const results = await executeConcurrently("", publishWithCtx);

      for (const result of results) {
        if (result.isErr()) {
          const msg = util.format(
            getStrings().solution.PublishFailNotice,
            ctx.projectSettings?.appName
          );
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

      // 1.1 hostType
      //const hostTypeNode = new QTreeNode(FrontendHostTypeQuestion);
      //hostTypeNode.condition = { contains: TabOptionItem.id };
      //capNode.addChild(hostTypeNode);

      // 1.1.1 SPFX Tab
      const spfxPlugin: Plugin = new SpfxPlugin();
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

      // 1.3 Language
      const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
      programmingLanguage.condition = { minItems: 1 };
      capNode.addChild(programmingLanguage);
    } else if (stage == Stage.migrateV1) {
      const capQuestion = createV1CapabilityQuestion();
      const capNode = new QTreeNode(capQuestion);
      node.addChild(capNode);
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
            returnUserError(
              new Error(getStrings().solution.FailedToDeployBeforeProvision),
              SolutionSource,
              SolutionError.CannotDeployBeforeProvision,
              HelpLinks.WhyNeedProvision
            )
          );
        }
      }
      let pluginsToDeploy: LoadedPlugin[];
      if (isDynamicQuestion) {
        const res = this.getSelectedPlugins(ctx);
        if (res.isErr()) {
          return err(
            returnUserError(
              new Error("No resource to deploy"),
              SolutionSource,
              SolutionError.NoResourceToDeploy
            )
          );
        }
        pluginsToDeploy = res.value.filter((plugin) => !!plugin.deploy);
      } else {
        const allPlugins = getAllResourcePlugins();
        pluginsToDeploy = allPlugins.filter((plugin) => !!plugin.deploy);
      }

      if (pluginsToDeploy.length === 0) {
        return err(
          returnUserError(
            new Error("No resource to deploy"),
            SolutionSource,
            SolutionError.NoResourceToDeploy
          )
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
            ? getStrings().solution.FailedToPublishBeforeProvision
            : getStrings().solution.SPFxAskProvisionBeforePublish;
          return err(
            returnUserError(
              new Error(errorMsg),
              SolutionSource,
              SolutionError.CannotPublishBeforeProvision,
              HelpLinks.WhyNeedProvision
            )
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
      node.addChild(new QTreeNode(GetUserEmailQuestion));
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
        new SystemError("UnknownError", "check point 1 - " + JSON.stringify(e), SolutionSource)
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
      if (localDebugTenantId) {
        const m365TenantId = parseTeamsAppTenantId(await ctx.appStudioToken?.getJsonObject());
        if (m365TenantId.isErr()) {
          throw err(m365TenantId.error);
        }

        const m365UserAccount = parseUserName(await ctx.appStudioToken?.getJsonObject());
        if (m365UserAccount.isErr()) {
          throw err(m365UserAccount.error);
        }

        if (m365TenantId.value !== localDebugTenantId) {
          const errorMessage: string = util.format(
            getStrings().solution.LocalDebugTenantConfirmNotice,
            localDebugTenantId,
            m365UserAccount.value,
            isMultiEnvEnabled() ? "localSettings.json" : "default.userdata"
          );

          return err(
            returnUserError(
              new Error(errorMessage),
              "Solution",
              SolutionError.CannotLocalDebugInDifferentTenant
            )
          );
        }
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
          "UnknownError",
          `check point ${checkPoint} - ${JSON.stringify(e)}`,
          SolutionSource
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
  async listAllCollaborators(
    ctx: SolutionContext
  ): Promise<Result<Record<string, ListCollaboratorResult>, FxError>> {
    return listAllCollaborators({ apiVersion: 1, ctx });
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
        returnUserError(
          new Error("Add resource is only supported for Tab app hosted in Azure."),
          SolutionSource,
          SolutionError.AddResourceNotSupport
        )
      );
    }

    const selectedPlugins = settings.activeResourcePlugins || [];

    if (!selectedPlugins) {
      return err(
        returnUserError(
          new Error("selectedPlugins is empty"),
          SolutionSource,
          SolutionError.InternelError
        )
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
        const groupNode = new QTreeNode({ type: "group" });
        groupNode.condition = { contains: AzureResourceApim.id };
        addAzureResourceNode.addChild(groupNode);
        const apim = res.value as QTreeNode;
        if (apim.data) {
          const funcNode = new QTreeNode(AskSubscriptionQuestion);
          AskSubscriptionQuestion.func = async (
            inputs: Inputs
          ): Promise<Result<SubscriptionInfo, FxError>> => {
            if (!ctx.azureAccountProvider) {
              return err(
                returnSystemError(
                  new Error("azureAccountProvider is undefined"),
                  "Solution",
                  SolutionError.InternelError
                )
              );
            }
            const res = await checkSubscription(ctx.envInfo, ctx.azureAccountProvider);
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
        returnUserError(
          new Error("Add capability is not supported for SPFx project"),
          SolutionSource,
          SolutionError.AddResourceNotSupport
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
      return err(
        returnUserError(new Error(`answer is empty!`), SolutionSource, SolutionError.InternelError)
      );
    }
    const settings = this.getAzureSolutionSettings(ctx);
    const originalSettings = deepCopy(settings);
    const canProceed = canAddResource(settings, ctx.telemetryReporter!);
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
        returnUserError(
          new Error(`answer of ${AzureSolutionQuestionNames.AddResources} is empty!`),
          SolutionSource,
          SolutionError.InvalidInput
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
      const e = returnUserError(
        new Error("SQL/APIM/KeyVault is already added."),
        SolutionSource,
        SolutionError.AddResourceNotSupport
      );
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.AddResource,
          e,
          ctx.telemetryReporter
        )
      );
    }

    let addNewResoruceToProvision = false;
    const notifications: string[] = [];
    const pluginsToScaffold: LoadedPlugin[] = [this.LocalDebugPlugin];
    const azureResource = Array.from(settings.azureResources || []);
    if (addFunc || ((addSQL || addApim) && !alreadyHaveFunction)) {
      pluginsToScaffold.push(functionPlugin);
      if (!azureResource.includes(AzureResourceFunction.id)) {
        azureResource.push(AzureResourceFunction.id);
        addNewResoruceToProvision = true;
      }
      notifications.push(AzureResourceFunction.label);
    }
    if (addSQL && !alreadyHaveSql) {
      pluginsToScaffold.push(sqlPlugin);
      azureResource.push(AzureResourceSQL.id);
      notifications.push(AzureResourceSQL.label);
      addNewResoruceToProvision = true;
    }
    if (addApim && !alreadyHaveApim) {
      pluginsToScaffold.push(apimPlugin);
      azureResource.push(AzureResourceApim.id);
      notifications.push(AzureResourceApim.label);
      addNewResoruceToProvision = true;
    }
    if (addKeyVault && !alreadyHaveKeyVault) {
      pluginsToScaffold.push(keyVaultPlugin);
      azureResource.push(AzureResourceKeyVault.id);
      notifications.push(AzureResourceKeyVault.label);
      addNewResoruceToProvision = true;
    }

    if (notifications.length > 0) {
      if (isArmSupportEnabled() && addNewResoruceToProvision) {
        showUpdateArmTemplateNotice(ctx.ui);
      }
      settings.azureResources = azureResource;
      await this.reloadPlugins(settings);
      ctx.logProvider?.info(`start scaffolding ${notifications.join(",")}.....`);
      const scaffoldRes = await this.doScaffold(ctx, pluginsToScaffold, addNewResoruceToProvision);
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
      if (addNewResoruceToProvision)
        ctx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, false); //if selected plugin changed, we need to re-do provision
      ctx.ui?.showMessage(
        "info",
        util.format(
          ctx.answers.platform === Platform.CLI
            ? getStrings().solution.AddResourceNoticeForCli
            : getStrings().solution.AddResourceNotice,
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
      return err(
        returnUserError(new Error(`answer is empty!`), SolutionSource, SolutionError.InternelError)
      );
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
      const e = returnUserError(
        new Error("There are no additional capabilities you can add to your project."),
        SolutionSource,
        SolutionError.FailedToAddCapability
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
      if (isArmSupportEnabled()) {
        showUpdateArmTemplateNotice(ctx.ui);
      }
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
            ? getStrings().solution.AddCapabilityNoticeForCli
            : getStrings().solution.AddCapabilitiesNoticeForCli
          : single
          ? getStrings().solution.AddCapabilityNotice
          : getStrings().solution.AddCapabilitiesNotice;
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
      return err(
        returnUserError(new Error(`answer is empty!`), SolutionSource, SolutionError.InternelError)
      );
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
            returnSystemError(
              new Error(`VS publish is not supposed to run on platform ${ctx.answers?.platform}`),
              SolutionSource,
              SolutionError.UnsupportedPlatform
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
      returnUserError(
        new Error(`executeUserTaskRouteFailed:${JSON.stringify(func)}`),
        SolutionSource,
        `executeUserTaskRouteFailed`
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
        returnSystemError(
          new Error(`config ${LOCAL_DEBUG_AAD_ID} is missing`),
          SolutionSource,
          SolutionError.RegisterTeamsAppAndAadError
        )
      );
    }
    const applicationIdUri = config
      .get(aadPlugin.name)
      ?.get(isLocal ? LOCAL_APPLICATION_ID_URIS : REMOTE_APPLICATION_ID_URIS);
    if (applicationIdUri === undefined || typeof applicationIdUri !== "string") {
      return err(
        returnSystemError(
          new Error(`config ${LOCAL_APPLICATION_ID_URIS} is missing`),
          SolutionSource,
          SolutionError.RegisterTeamsAppAndAadError
        )
      );
    }
    const clientSecret = config
      .get(aadPlugin.name)
      ?.get(isLocal ? LOCAL_CLIENT_SECRET : REMOTE_CLIENT_SECRET);
    if (clientSecret === undefined || typeof clientSecret !== "string") {
      return err(
        returnSystemError(
          new Error(`config ${LOCAL_CLIENT_SECRET} is missing`),
          SolutionSource,
          SolutionError.RegisterTeamsAppAndAadError
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
