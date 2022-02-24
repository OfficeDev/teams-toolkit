// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, hooks } from "@feathersjs/hooks";
import {
  AppPackageFolderName,
  BuildFolderName,
  ConfigFolderName,
  CoreCallbackEvent,
  CoreCallbackFunc,
  err,
  ExistingTeamsAppType,
  Func,
  FunctionRouter,
  FxError,
  InputConfigsFolderName,
  Inputs,
  Json,
  LogProvider,
  ok,
  OptionItem,
  Platform,
  ProjectConfig,
  ProjectSettings,
  QTreeNode,
  Result,
  Solution,
  SolutionContext,
  Stage,
  StatesFolderName,
  Tools,
  UserCancelError,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as jsonschema from "jsonschema";
import * as path from "path";
import { Container } from "typedi";
import * as uuid from "uuid";
import { environmentManager } from "..";
import { FeatureFlagName } from "../common/constants";
import { globalStateUpdate } from "../common/globalState";
import { localSettingsFileName } from "../common/localSettingsProvider";
import { TelemetryReporterInstance } from "../common/telemetry";
import { getRootDirectory, isConfigUnifyEnabled, mapToJson } from "../common/tools";
import { getLocalAppName } from "../plugins/resource/appstudio/utils/utils";
import { AppStudioPluginV3 } from "../plugins/resource/appstudio/v3";
import { MessageExtensionItem } from "../plugins/solution/fx-solution/question";
import {
  BuiltInFeaturePluginNames,
  BuiltInSolutionNames,
} from "../plugins/solution/fx-solution/v3/constants";
import { CallbackRegistry } from "./callback";
import { checkPermission, grantPermission, listCollaborator } from "./collaborator";
import { LocalCrypto } from "./crypto";
import { downloadSample } from "./downloadSample";
import {
  CopyFileError,
  FunctionRouterError,
  InvalidInputError,
  LoadSolutionError,
  NonExistEnvNameError,
  ObjectIsUndefinedError,
  OperationNotSupportedForExistingAppError,
  ProjectFolderExistError,
  ProjectFolderInvalidError,
  TaskNotSupportError,
  WriteFileError,
} from "./error";
import { ConcurrentLockerMW } from "./middleware/concurrentLocker";
import { ContextInjectorMW } from "./middleware/contextInjector";
import {
  askNewEnvironment,
  EnvInfoLoaderMW,
  loadSolutionContext,
} from "./middleware/envInfoLoader";
import { EnvInfoLoaderMW_V3 } from "./middleware/envInfoLoaderV3";
import { EnvInfoWriterMW } from "./middleware/envInfoWriter";
import { EnvInfoWriterMW_V3 } from "./middleware/envInfoWriterV3";
import { ErrorHandlerMW } from "./middleware/errorHandler";
import { LocalSettingsLoaderMW } from "./middleware/localSettingsLoader";
import { LocalSettingsWriterMW } from "./middleware/localSettingsWriter";
import { ProjectMigratorMW } from "./middleware/projectMigrator";
import {
  getProjectSettingsPath,
  ProjectSettingsLoaderMW,
} from "./middleware/projectSettingsLoader";
import { ProjectSettingsWriterMW } from "./middleware/projectSettingsWriter";
import {
  getQuestionsForAddFeature,
  getQuestionsForCreateProjectV2,
  getQuestionsForCreateProjectV3,
  getQuestionsForDeploy,
  getQuestionsForInit,
  getQuestionsForProvision,
  getQuestionsForPublish,
  getQuestionsForUserTaskV2,
  getQuestionsForUserTaskV3,
  getQuestionsV2,
  QuestionModelMW,
} from "./middleware/questionModel";
import { SolutionLoaderMW } from "./middleware/solutionLoader";
import { SolutionLoaderMW_V3 } from "./middleware/solutionLoaderV3";
import {
  BotOptionItem,
  CoreQuestionNames,
  ProjectNamePattern,
  QuestionAppName,
  QuestionRootFolder,
  ScratchOptionNo,
  TabOptionItem,
  TabSPFxItem,
} from "./question";
import { getAllSolutionPluginsV2, getSolutionPluginV2ByName } from "./SolutionPluginContainer";
import { newEnvInfoV3 } from "./tools";
import { isPureExistingApp } from "./utils";
// TODO: For package.json,
// use require instead of import because of core building/packaging method.
// Using import will cause the build folder structure to change.
const corePackage = require("../../package.json");

export interface CoreHookContext extends HookContext {
  projectSettings?: ProjectSettings;
  solutionContext?: SolutionContext;
  solution?: Solution;
  //for v2 api
  contextV2?: v2.Context;
  solutionV2?: v2.SolutionPlugin;
  envInfoV2?: v2.EnvInfoV2;
  localSettings?: Json;

  //for v3
  envInfoV3?: v3.EnvInfoV3;
  solutionV3?: v3.ISolution;
}

function featureFlagEnabled(flagName: string): boolean {
  const flag = process.env[flagName];
  if (flag !== undefined && flag.toLowerCase() === "true") {
    return true;
  } else {
    return false;
  }
}

export function isV3() {
  return featureFlagEnabled(FeatureFlagName.APIV3);
}

// On VS calling CLI, interactive questions need to be skipped.
export function isVsCallingCli() {
  return featureFlagEnabled(FeatureFlagName.VSCallingCLI);
}

export function isVSProject(projectSettings: ProjectSettings) {
  return projectSettings.programmingLanguage === "csharp";
}

export let Logger: LogProvider;
export let currentStage: Stage;
export let TOOLS: Tools;
export function setTools(tools: Tools) {
  TOOLS = tools;
}
export class FxCore implements v3.ICore {
  tools: Tools;
  isFromSample?: boolean;
  settingsVersion?: string;

  constructor(tools: Tools) {
    this.tools = tools;
    TOOLS = tools;
    Logger = tools.logProvider;
    TelemetryReporterInstance.telemetryReporter = tools.telemetryReporter;
  }

  /**
   * @todo this's a really primitive implement. Maybe could use Subscription Model to
   * refactor later.
   */
  public on(event: CoreCallbackEvent, callback: CoreCallbackFunc): void {
    return CallbackRegistry.set(event, callback);
  }

  async createProject(inputs: Inputs): Promise<Result<string, FxError>> {
    if (isV3()) {
      return this.createProjectV3(inputs);
    } else {
      return this.createProjectV2(inputs);
    }
  }
  @hooks([
    ErrorHandlerMW,
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(true),
  ])
  async createProjectV2(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<string, FxError>> {
    if (!ctx) {
      return err(new ObjectIsUndefinedError("ctx for createProject"));
    }
    currentStage = Stage.create;
    inputs.stage = Stage.create;
    let folder = inputs[QuestionRootFolder.name] as string;
    if (inputs.platform === Platform.VSCode) {
      folder = getRootDirectory();
      try {
        await fs.ensureDir(folder);
      } catch (e) {
        throw ProjectFolderInvalidError(folder);
      }
    }
    const scratch = inputs[CoreQuestionNames.CreateFromScratch] as string;
    let projectPath: string;
    let globalStateDescription = "openReadme";
    const automaticNpmInstall = "automaticNpmInstall";
    if (scratch === ScratchOptionNo.id) {
      // create from sample
      const downloadRes = await downloadSample(inputs, ctx);
      if (downloadRes.isErr()) {
        return err(downloadRes.error);
      }
      projectPath = downloadRes.value;
      globalStateDescription = "openSampleReadme";
    } else {
      // create from new
      const appName = inputs[QuestionAppName.name] as string;
      if (undefined === appName) return err(InvalidInputError(`App Name is empty`, inputs));

      const validateResult = jsonschema.validate(appName, {
        pattern: ProjectNamePattern,
      });
      if (validateResult.errors && validateResult.errors.length > 0) {
        return err(InvalidInputError(`${validateResult.errors[0].message}`, inputs));
      }

      projectPath = path.join(folder, appName);
      inputs.projectPath = projectPath;
      const folderExist = await fs.pathExists(projectPath);
      if (folderExist) {
        return err(ProjectFolderExistError(projectPath));
      }
      await fs.ensureDir(projectPath);
      await fs.ensureDir(path.join(projectPath, `.${ConfigFolderName}`));
      await fs.ensureDir(path.join(projectPath, path.join("templates", `${AppPackageFolderName}`)));
      const basicFolderRes = await createBasicFolderStructure(inputs);
      if (basicFolderRes.isErr()) {
        return err(basicFolderRes.error);
      }

      const projectSettings: ProjectSettings = {
        appName: appName,
        projectId: inputs.projectId ? inputs.projectId : uuid.v4(),
        version: getProjectSettingsVersion(),
        isFromSample: false,
      };
      if (inputs.existingAppConfig?.isCreatedFromExistingApp) {
        // there is no solution settings if created from existing app
        // create default env
        ctx.projectSettings = projectSettings;
        const newEnvConfig = environmentManager.newEnvConfigData(appName, inputs.existingAppConfig);
        const writeEnvResult = await environmentManager.writeEnvConfig(
          projectPath,
          newEnvConfig,
          environmentManager.getDefaultEnvName()
        );
        if (writeEnvResult.isErr()) {
          return err(writeEnvResult.error);
        }
        // call App Studio V3 API to create manifest with placeholder
        const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
        const contextV2 = createV2Context(projectSettings);
        const initRes = await appStudio.init(contextV2, inputs as v2.InputsWithProjectPath);
        if (initRes.isErr()) return err(initRes.error);
        const manifestCaps: v3.ManifestCapability[] = [];
        inputs.existingAppConfig.newAppTypes.forEach((t) => {
          if (t === ExistingTeamsAppType.Bot) manifestCaps.push({ name: "Bot", existingApp: true });
          else if (t === ExistingTeamsAppType.StaticTab)
            manifestCaps.push({ name: "staticTab", existingApp: true });
          else if (t === ExistingTeamsAppType.ConfigurableTab)
            manifestCaps.push({ name: "configurableTab", existingApp: true });
          else if (t === ExistingTeamsAppType.MessageExtension)
            manifestCaps.push({ name: "MessageExtension", existingApp: true });
        });
        const addCapabilitiesRes = await appStudio.addCapabilities(
          contextV2,
          inputs as v2.InputsWithProjectPath,
          manifestCaps
        );
        if (addCapabilitiesRes.isErr()) return err(addCapabilitiesRes.error);
        if (isConfigUnifyEnabled()) {
          const createLocalEnvResult = await this.createEnvWithName(
            environmentManager.getLocalEnvName(),
            projectSettings,
            inputs
          );
          if (createLocalEnvResult.isErr()) {
            return err(createLocalEnvResult.error);
          }
        }
      } else {
        projectSettings.solutionSettings = {
          name: "",
          version: "1.0.0",
        };
        projectSettings.programmingLanguage = inputs[CoreQuestionNames.ProgrammingLanguage];
        ctx.projectSettings = projectSettings;
        const createEnvResult = await this.createEnvWithName(
          environmentManager.getDefaultEnvName(),
          projectSettings,
          inputs
        );
        if (createEnvResult.isErr()) {
          return err(createEnvResult.error);
        }

        if (isConfigUnifyEnabled()) {
          const createLocalEnvResult = await this.createEnvWithName(
            environmentManager.getLocalEnvName(),
            projectSettings,
            inputs
          );
          if (createLocalEnvResult.isErr()) {
            return err(createLocalEnvResult.error);
          }
        }

        const solution = await getSolutionPluginV2ByName(inputs[CoreQuestionNames.Solution]);
        if (!solution) {
          return err(new LoadSolutionError());
        }
        ctx.solutionV2 = solution;
        projectSettings.solutionSettings.name = solution.name;
        const contextV2 = createV2Context(projectSettings);
        ctx.contextV2 = contextV2;
        const scaffoldSourceCodeRes = await solution.scaffoldSourceCode(contextV2, inputs);
        if (scaffoldSourceCodeRes.isErr()) {
          return err(scaffoldSourceCodeRes.error);
        }
        const generateResourceTemplateRes = await solution.generateResourceTemplate(
          contextV2,
          inputs
        );
        if (generateResourceTemplateRes.isErr()) {
          return err(generateResourceTemplateRes.error);
        }
        // ctx.provisionInputConfig = generateResourceTemplateRes.value;
        if (solution.createEnv) {
          inputs.copy = false;
          const createEnvRes = await solution.createEnv(contextV2, inputs);
          if (createEnvRes.isErr()) {
            return err(createEnvRes.error);
          }
        }
      }
    }
    if (inputs.platform === Platform.VSCode) {
      await globalStateUpdate(globalStateDescription, true);
      await globalStateUpdate(automaticNpmInstall, true);
    }
    return ok(projectPath);
  }
  @hooks([ErrorHandlerMW, QuestionModelMW, ContextInjectorMW])
  async createProjectV3(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<string, FxError>> {
    if (!ctx) {
      return err(new ObjectIsUndefinedError("ctx for createProject"));
    }
    currentStage = Stage.create;
    inputs.stage = Stage.create;
    let folder = inputs[QuestionRootFolder.name] as string;
    if (inputs.platform === Platform.VSCode || inputs.platform === Platform.VS) {
      folder = getRootDirectory();
      try {
        await fs.ensureDir(folder);
      } catch (e) {
        throw ProjectFolderInvalidError(folder);
      }
    }
    const scratch = inputs[CoreQuestionNames.CreateFromScratch] as string;
    let projectPath: string;
    let globalStateDescription = "openReadme";
    const automaticNpmInstall = "automaticNpmInstall";
    if (scratch === ScratchOptionNo.id) {
      // create from sample
      const downloadRes = await downloadSample(inputs, ctx);
      if (downloadRes.isErr()) {
        return err(downloadRes.error);
      }
      projectPath = downloadRes.value;
      globalStateDescription = "openSampleReadme";
    } else {
      // create from new
      const appName = inputs[QuestionAppName.name] as string;
      if (undefined === appName) return err(InvalidInputError(`App Name is empty`, inputs));

      const validateResult = jsonschema.validate(appName, {
        pattern: ProjectNamePattern,
      });
      if (validateResult.errors && validateResult.errors.length > 0) {
        return err(InvalidInputError(`${validateResult.errors[0].message}`, inputs));
      }

      projectPath = path.join(folder, appName);
      inputs.projectPath = projectPath;
      const folderExist = await fs.pathExists(projectPath);
      if (folderExist) {
        return err(ProjectFolderExistError(projectPath));
      }
      await fs.ensureDir(projectPath);
      await fs.ensureDir(path.join(projectPath, `.${ConfigFolderName}`));

      const capabilities = inputs[CoreQuestionNames.Capabilities] as string[];

      // init
      const initInputs: v2.InputsWithProjectPath & { solution?: string } = {
        ...inputs,
        projectPath: projectPath,
      };
      const initRes = await this._init(initInputs, ctx);
      if (initRes.isErr()) {
        return err(initRes.error);
      }
      // persist projectSettings.json
      ctx.projectSettings!.programmingLanguage = inputs[CoreQuestionNames.ProgrammingLanguage];
      ctx.projectSettings!.isFromSample = false;
      const projectSettingsPath = getProjectSettingsPath(projectPath);
      await fs.writeFile(projectSettingsPath, JSON.stringify(ctx.projectSettings!, null, 4));
      if (!inputs.existingAppConfig?.isCreatedFromExistingApp) {
        // addFeature
        const features: string[] = [];
        if (!capabilities.includes(TabSPFxItem.id)) {
          features.push(BuiltInFeaturePluginNames.aad);
        }
        if (inputs.platform === Platform.VS) {
          features.push(BuiltInFeaturePluginNames.dotnet);
        } else {
          if (capabilities.includes(TabOptionItem.id)) {
            features.push(BuiltInFeaturePluginNames.frontend);
          } else if (capabilities.includes(TabSPFxItem.id)) {
            features.push(BuiltInFeaturePluginNames.spfx);
          }
          if (
            capabilities.includes(BotOptionItem.id) ||
            capabilities.includes(MessageExtensionItem.id)
          ) {
            features.push(BuiltInFeaturePluginNames.bot);
          }
        }
        const addFeatureInputs: v3.SolutionAddFeatureInputs = {
          ...inputs,
          projectPath: projectPath,
          features: features,
        };
        const addFeatureRes = await this.addFeature(addFeatureInputs);
        if (addFeatureRes.isErr()) {
          return err(addFeatureRes.error);
        }
      }
    }
    if (inputs.platform === Platform.VSCode) {
      await globalStateUpdate(globalStateDescription, true);
      await globalStateUpdate(automaticNpmInstall, true);
    }
    return ok(projectPath);
  }

  /**
   * switch to different versions of provisionResources
   */
  async provisionResources(inputs: Inputs): Promise<Result<Void, FxError>> {
    if (isV3()) {
      return this.provisionResourcesV3(inputs);
    } else {
      return this.provisionResourcesV2(inputs);
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW,
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async provisionResourcesV2(
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<Void, FxError>> {
    currentStage = Stage.provision;
    inputs.stage = Stage.provision;
    if (!ctx || !ctx.solutionV2 || !ctx.contextV2 || !ctx.envInfoV2) {
      return err(new ObjectIsUndefinedError("Provision input stuff"));
    }
    const envInfo = ctx.envInfoV2;
    const result = await ctx.solutionV2.provisionResources(
      ctx.contextV2,
      inputs,
      envInfo,
      this.tools.tokenProvider
    );
    return result;
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW_V3(false),
    SolutionLoaderMW_V3,
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW_V3(),
  ])
  async provisionResourcesV3(
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<Void, FxError>> {
    currentStage = Stage.provision;
    inputs.stage = Stage.provision;
    if (
      ctx &&
      ctx.solutionV3 &&
      ctx.contextV2 &&
      ctx.envInfoV3 &&
      ctx.solutionV3.provisionResources
    ) {
      const res = await ctx.solutionV3.provisionResources(
        ctx.contextV2,
        inputs as v2.InputsWithProjectPath,
        ctx.envInfoV3,
        TOOLS.tokenProvider
      );
      return res;
    }
    return ok(Void);
  }

  /**
   * Only used to provision Teams app with user provided app package
   * @param inputs
   * @returns teamsAppId on provision success
   */
  async provisionTeamsAppForCLI(inputs: Inputs): Promise<Result<string, FxError>> {
    if (!inputs.appPackagePath) {
      return err(InvalidInputError("appPackagePath is not defined", inputs));
    }
    const projectSettings: ProjectSettings = {
      appName: "fake",
      projectId: uuid.v4(),
    };
    const context: v2.Context = {
      userInteraction: TOOLS.ui,
      logProvider: TOOLS.logProvider,
      telemetryReporter: TOOLS.telemetryReporter!,
      cryptoProvider: new LocalCrypto(projectSettings.projectId),
      permissionRequestProvider: TOOLS.permissionRequest,
      projectSetting: projectSettings,
    };
    const appStudioV3 = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
    return appStudioV3.registerTeamsApp(
      context,
      inputs as v2.InputsWithProjectPath,
      newEnvInfoV3(),
      TOOLS.tokenProvider
    );
  }

  async deployArtifacts(inputs: Inputs): Promise<Result<Void, FxError>> {
    if (isV3()) return this.deployArtifactsV3(inputs);
    else return this.deployArtifactsV2(inputs);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW,
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async deployArtifactsV2(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    currentStage = Stage.deploy;
    inputs.stage = Stage.deploy;
    if (!ctx?.projectSettings) {
      return err(new ObjectIsUndefinedError("deploy input stuff"));
    }
    if (isPureExistingApp(ctx.projectSettings)) {
      // existing app scenario, deploy has no effect
      return err(new OperationNotSupportedForExistingAppError("deploy"));
    }
    if (!ctx.solutionV2 || !ctx.contextV2 || !ctx.envInfoV2) {
      const name = undefinedName(
        [ctx, ctx?.solutionV2, ctx?.contextV2, ctx?.envInfoV2],
        ["ctx", "ctx.solutionV2", "ctx.contextV2", "ctx.envInfoV2"]
      );
      return err(new ObjectIsUndefinedError(`Deploy input stuff: ${name}`));
    }

    if (ctx.solutionV2.deploy)
      return await ctx.solutionV2.deploy(
        ctx.contextV2,
        inputs,
        ctx.envInfoV2,
        this.tools.tokenProvider
      );
    else return ok(Void);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW_V3(false),
    SolutionLoaderMW_V3,
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW_V3(),
  ])
  async deployArtifactsV3(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    currentStage = Stage.deploy;
    inputs.stage = Stage.deploy;
    if (ctx && ctx.solutionV3 && ctx.contextV2 && ctx.envInfoV3 && ctx.solutionV3.deploy) {
      const res = await ctx.solutionV3.deploy(
        ctx.contextV2,
        inputs as v2.InputsWithProjectPath,
        ctx.envInfoV3,
        TOOLS.tokenProvider
      );
      return res;
    }
    return ok(Void);
  }
  async localDebug(inputs: Inputs): Promise<Result<Void, FxError>> {
    inputs.env = environmentManager.getLocalEnvName();
    if (isV3()) return this.provisionResourcesV3(inputs);
    else return this.localDebugV2(inputs);
  }
  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(!isConfigUnifyEnabled()),
    LocalSettingsLoaderMW,
    SolutionLoaderMW,
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(!isConfigUnifyEnabled()),
    LocalSettingsWriterMW,
  ])
  async localDebugV2(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    currentStage = Stage.debug;
    inputs.stage = Stage.debug;
    if (!ctx?.projectSettings) {
      return err(new ObjectIsUndefinedError("local debug input stuff"));
    }
    if (isPureExistingApp(ctx.projectSettings)) {
      // existing app scenario, local debug has no effect
      return err(new OperationNotSupportedForExistingAppError("localDebug"));
    }
    if (!ctx.solutionV2 || !ctx.contextV2) {
      const name = undefinedName(
        [ctx, ctx?.solutionV2, ctx?.contextV2],
        ["ctx", "ctx.solutionV2", "ctx.contextV2"]
      );
      return err(new ObjectIsUndefinedError(`localDebug input stuff (${name})`));
    }
    if (!ctx.localSettings) ctx.localSettings = {};
    if (ctx.solutionV2.provisionLocalResource) {
      const res = await ctx.solutionV2.provisionLocalResource(
        ctx.contextV2,
        inputs,
        ctx.localSettings,
        this.tools.tokenProvider,
        ctx.envInfoV2
      );
      if (res.kind === "success") {
        ctx.localSettings = res.output;
        return ok(Void);
      } else if (res.kind === "partialSuccess") {
        ctx.localSettings = res.output;
        return err(res.error);
      } else {
        return err(res.error);
      }
    } else {
      return ok(Void);
    }
  }

  _setEnvInfoV2(ctx?: CoreHookContext) {
    if (ctx && ctx.solutionContext) {
      //workaround, compatible to api v2
      ctx.envInfoV2 = {
        envName: ctx.solutionContext.envInfo.envName,
        config: ctx.solutionContext.envInfo.config,
        state: {},
      };
      ctx.envInfoV2.state = mapToJson(ctx.solutionContext.envInfo.state);
    }
  }
  async publishApplication(inputs: Inputs): Promise<Result<Void, FxError>> {
    if (isV3()) return this.publishApplicationV3(inputs);
    else return this.publishApplicationV2(inputs);
  }
  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW,
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async publishApplicationV2(
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<Void, FxError>> {
    currentStage = Stage.publish;
    inputs.stage = Stage.publish;
    if (!ctx || !ctx.solutionV2 || !ctx.contextV2 || !ctx.envInfoV2) {
      const name = undefinedName(
        [ctx, ctx?.solutionV2, ctx?.contextV2, ctx?.envInfoV2],
        ["ctx", "ctx.solutionV2", "ctx.contextV2", "ctx.envInfoV2"]
      );
      return err(new ObjectIsUndefinedError(`publish input stuff: ${name}`));
    }
    return await ctx.solutionV2.publishApplication(
      ctx.contextV2,
      inputs,
      ctx.envInfoV2,
      this.tools.tokenProvider.appStudioToken
    );
  }
  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW,
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async publishApplicationV3(
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<Void, FxError>> {
    currentStage = Stage.publish;
    inputs.stage = Stage.publish;
    if (
      ctx &&
      ctx.solutionV3 &&
      ctx.contextV2 &&
      ctx.envInfoV3 &&
      ctx.solutionV3.publishApplication
    ) {
      const res = await ctx.solutionV3.publishApplication(
        ctx.contextV2,
        inputs as v2.InputsWithProjectPath,
        ctx.envInfoV3,
        TOOLS.tokenProvider.appStudioToken
      );
      return res;
    }
    return ok(Void);
  }
  async executeUserTask(func: Func, inputs: Inputs): Promise<Result<unknown, FxError>> {
    if (isV3()) return this.executeUserTaskV3(func, inputs);
    else return this.executeUserTaskV2(func, inputs);
  }
  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    LocalSettingsLoaderMW,
    SolutionLoaderMW,
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async executeUserTaskV2(
    func: Func,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<unknown, FxError>> {
    currentStage = Stage.userTask;
    inputs.stage = Stage.userTask;
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if ("" !== namespace && array.length > 0) {
      if (!ctx || !ctx.solutionV2 || !ctx.envInfoV2) {
        const name = undefinedName(
          [ctx, ctx?.solutionV2, ctx?.envInfoV2],
          ["ctx", "ctx.solutionV2", "ctx.envInfoV2"]
        );
        return err(new ObjectIsUndefinedError(`executeUserTask input stuff: ${name}`));
      }
      if (!ctx.contextV2) ctx.contextV2 = createV2Context(newProjectSettings());
      if (ctx.solutionV2.executeUserTask) {
        if (!ctx.localSettings) ctx.localSettings = {};
        const res = await ctx.solutionV2.executeUserTask(
          ctx.contextV2,
          inputs,
          func,
          ctx.localSettings,
          ctx.envInfoV2,
          this.tools.tokenProvider
        );
        return res;
      } else return err(FunctionRouterError(func));
    }
    return err(FunctionRouterError(func));
  }
  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW_V3(false),
    LocalSettingsLoaderMW,
    SolutionLoaderMW_V3,
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async executeUserTaskV3(
    func: Func,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<unknown, FxError>> {
    currentStage = Stage.userTask;
    inputs.stage = Stage.userTask;
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if ("" !== namespace && array.length > 0) {
      if (!ctx || !ctx.solutionV3 || !ctx.envInfoV3) {
        const name = undefinedName(
          [ctx, ctx?.solutionV3, ctx?.envInfoV3],
          ["ctx", "ctx.solutionV3", "ctx.envInfoV3"]
        );
        return err(new ObjectIsUndefinedError(`executeUserTask input stuff: ${name}`));
      }
      if (!ctx.contextV2) ctx.contextV2 = createV2Context(newProjectSettings());
      if (ctx.solutionV3.executeUserTask) {
        const res = await ctx.solutionV3.executeUserTask(
          ctx.contextV2,
          inputs,
          func,
          ctx.envInfoV3,
          this.tools.tokenProvider
        );
        return res;
      } else return err(FunctionRouterError(func));
    }
    return err(FunctionRouterError(func));
  }
  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(true),
    SolutionLoaderMW,
    ContextInjectorMW,
    EnvInfoWriterMW(),
  ])
  async getQuestions(
    stage: Stage,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    if (!ctx) return err(new ObjectIsUndefinedError("getQuestions input stuff"));
    inputs.stage = Stage.getQuestions;
    currentStage = Stage.getQuestions;
    if (stage === Stage.create) {
      delete inputs.projectPath;
      return await this._getQuestionsForCreateProjectV2(inputs);
    } else {
      const contextV2 = ctx.contextV2 ? ctx.contextV2 : createV2Context(newProjectSettings());
      const solutionV2 = ctx.solutionV2 ? ctx.solutionV2 : await getAllSolutionPluginsV2()[0];
      const envInfoV2 = ctx.envInfoV2
        ? ctx.envInfoV2
        : { envName: environmentManager.getDefaultEnvName(), config: {}, state: {} };
      inputs.stage = stage;
      return await this._getQuestions(contextV2, solutionV2, stage, inputs, envInfoV2);
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(true),
    SolutionLoaderMW,
    ContextInjectorMW,
    EnvInfoWriterMW(),
  ])
  async getQuestionsForUserTask(
    func: FunctionRouter,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    if (!ctx) return err(new ObjectIsUndefinedError("getQuestionsForUserTask input stuff"));
    inputs.stage = Stage.getQuestions;
    currentStage = Stage.getQuestions;
    const contextV2 = ctx.contextV2 ? ctx.contextV2 : createV2Context(newProjectSettings());
    const solutionV2 = ctx.solutionV2 ? ctx.solutionV2 : await getAllSolutionPluginsV2()[0];
    const envInfoV2 = ctx.envInfoV2
      ? ctx.envInfoV2
      : { envName: environmentManager.getDefaultEnvName(), config: {}, state: {} };
    return await this._getQuestionsForUserTask(contextV2, solutionV2, func, inputs, envInfoV2);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    LocalSettingsLoaderMW,
    ContextInjectorMW,
  ])
  async getProjectConfig(
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<ProjectConfig | undefined, FxError>> {
    if (!ctx) return err(new ObjectIsUndefinedError("getProjectConfig input stuff"));
    inputs.stage = Stage.getProjectConfig;
    currentStage = Stage.getProjectConfig;
    return ok({
      settings: ctx!.projectSettings,
      config: ctx!.solutionContext?.envInfo.state,
      localSettings: ctx!.solutionContext?.localSettings,
    });
  }
  async grantPermission(inputs: Inputs): Promise<Result<any, FxError>> {
    if (isV3()) return this.grantPermissionV3(inputs);
    else return this.grantPermissionV2(inputs);
  }
  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW,
    QuestionModelMW,
    ContextInjectorMW,
  ])
  async grantPermissionV2(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    currentStage = Stage.grantPermission;
    inputs.stage = Stage.grantPermission;
    const projectPath = inputs.projectPath;
    if (!projectPath) {
      return err(new ObjectIsUndefinedError("projectPath"));
    }
    return ctx!.solutionV2!.grantPermission!(
      ctx!.contextV2!,
      { ...inputs, projectPath: projectPath },
      ctx!.envInfoV2!,
      this.tools.tokenProvider
    );
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW_V3(false),
    QuestionModelMW,
    ContextInjectorMW,
  ])
  async grantPermissionV3(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    currentStage = Stage.grantPermission;
    inputs.stage = Stage.grantPermission;
    const projectPath = inputs.projectPath;
    if (!projectPath) {
      return err(new ObjectIsUndefinedError("projectPath"));
    }
    if (ctx && ctx.contextV2 && ctx.envInfoV3) {
      const res = await grantPermission(
        ctx.contextV2,
        inputs as v2.InputsWithProjectPath,
        ctx.envInfoV3,
        TOOLS.tokenProvider
      );
      return res;
    }
    return err(new ObjectIsUndefinedError("ctx, contextV2, envInfoV3"));
  }

  async checkPermission(inputs: Inputs): Promise<Result<any, FxError>> {
    if (isV3()) return this.checkPermissionV3(inputs);
    else return this.checkPermissionV2(inputs);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW,
    QuestionModelMW,
    ContextInjectorMW,
  ])
  async checkPermissionV2(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    currentStage = Stage.checkPermission;
    inputs.stage = Stage.checkPermission;
    const projectPath = inputs.projectPath;
    if (!projectPath) {
      return err(new ObjectIsUndefinedError("projectPath"));
    }
    return ctx!.solutionV2!.checkPermission!(
      ctx!.contextV2!,
      { ...inputs, projectPath: projectPath },
      ctx!.envInfoV2!,
      this.tools.tokenProvider
    );
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW_V3(false),
    ContextInjectorMW,
  ])
  async checkPermissionV3(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    currentStage = Stage.checkPermission;
    inputs.stage = Stage.checkPermission;
    const projectPath = inputs.projectPath;
    if (!projectPath) {
      return err(new ObjectIsUndefinedError("projectPath"));
    }
    if (ctx && ctx.contextV2 && ctx.envInfoV3) {
      const res = await checkPermission(
        ctx.contextV2,
        inputs as v2.InputsWithProjectPath,
        ctx.envInfoV3,
        TOOLS.tokenProvider
      );
      return res;
    }
    return err(new ObjectIsUndefinedError("ctx, contextV2, envInfoV3"));
  }

  async listCollaborator(inputs: Inputs): Promise<Result<any, FxError>> {
    if (isV3()) return this.listCollaboratorV3(inputs);
    else return this.listCollaboratorV2(inputs);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW,
    QuestionModelMW,
    ContextInjectorMW,
  ])
  async listCollaboratorV2(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    currentStage = Stage.listCollaborator;
    inputs.stage = Stage.listCollaborator;
    const projectPath = inputs.projectPath;
    if (!projectPath) {
      return err(new ObjectIsUndefinedError("projectPath"));
    }
    return ctx!.solutionV2!.listCollaborator!(
      ctx!.contextV2!,
      { ...inputs, projectPath: projectPath },
      ctx!.envInfoV2!,
      this.tools.tokenProvider
    );
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW_V3(false),
    ContextInjectorMW,
  ])
  async listCollaboratorV3(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    currentStage = Stage.listCollaborator;
    inputs.stage = Stage.listCollaborator;
    const projectPath = inputs.projectPath;
    if (!projectPath) {
      return err(new ObjectIsUndefinedError("projectPath"));
    }
    if (ctx && ctx.contextV2 && ctx.envInfoV3) {
      const res = await listCollaborator(
        ctx.contextV2,
        inputs as v2.InputsWithProjectPath,
        ctx.envInfoV3,
        TOOLS.tokenProvider
      );
      return res;
    }
    return err(new ObjectIsUndefinedError("ctx, contextV2, envInfoV3"));
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    ContextInjectorMW,
  ])
  async getSelectedEnv(
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<string | undefined, FxError>> {
    return ok(ctx?.envInfoV2?.envName);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(true),
    ContextInjectorMW,
  ])
  async encrypt(
    plaintext: string,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<string, FxError>> {
    if (!ctx) return err(new ObjectIsUndefinedError("ctx"));
    if (!ctx.contextV2) return err(new ObjectIsUndefinedError("ctx.contextV2"));
    return ctx.contextV2.cryptoProvider.encrypt(plaintext);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(true),
    ContextInjectorMW,
  ])
  async decrypt(
    ciphertext: string,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<string, FxError>> {
    if (!ctx) return err(new ObjectIsUndefinedError("ctx"));
    if (!ctx.contextV2) return err(new ObjectIsUndefinedError("ctx.contextV2"));
    return ctx.contextV2.cryptoProvider.decrypt(ciphertext);
  }

  async buildArtifacts(inputs: Inputs): Promise<Result<Void, FxError>> {
    throw new TaskNotSupportError(Stage.build);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectSettingsLoaderMW,
    SolutionLoaderMW,
    EnvInfoLoaderMW(true),
    ContextInjectorMW,
  ])
  async createEnv(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    if (!ctx) return err(new ObjectIsUndefinedError("createEnv input stuff"));
    const projectSettings = ctx.projectSettings;
    if (!projectSettings) {
      return ok(Void);
    }

    const core = ctx!.self as FxCore;
    const createEnvCopyInput = await askNewEnvironment(ctx!, inputs);

    if (
      !createEnvCopyInput ||
      !createEnvCopyInput.targetEnvName ||
      !createEnvCopyInput.sourceEnvName
    ) {
      return err(UserCancelError);
    }

    const createEnvResult = await this.createEnvCopy(
      createEnvCopyInput.targetEnvName,
      createEnvCopyInput.sourceEnvName,
      inputs,
      core
    );

    if (createEnvResult.isErr()) {
      return createEnvResult;
    }

    inputs.sourceEnvName = createEnvCopyInput.sourceEnvName;
    inputs.targetEnvName = createEnvCopyInput.targetEnvName;

    if (!ctx.solutionV2 || !ctx.contextV2)
      return err(new ObjectIsUndefinedError("ctx.solutionV2, ctx.contextV2"));
    if (ctx.solutionV2.createEnv) {
      inputs.copy = true;
      return await ctx.solutionV2.createEnv(ctx.contextV2, inputs);
    }
    return ok(Void);
  }

  async createEnvWithName(
    targetEnvName: string,
    projectSettings: ProjectSettings,
    inputs: Inputs
  ): Promise<Result<Void, FxError>> {
    let appName = projectSettings.appName;
    if (targetEnvName === environmentManager.getLocalEnvName()) {
      appName = getLocalAppName(appName);
    }
    const newEnvConfig = environmentManager.newEnvConfigData(appName);
    const writeEnvResult = await environmentManager.writeEnvConfig(
      inputs.projectPath!,
      newEnvConfig,
      targetEnvName
    );
    if (writeEnvResult.isErr()) {
      return err(writeEnvResult.error);
    }
    this.tools.logProvider.debug(
      `[core] persist ${targetEnvName} env state to path ${writeEnvResult.value}: ${JSON.stringify(
        newEnvConfig
      )}`
    );
    return ok(Void);
  }

  async createEnvCopy(
    targetEnvName: string,
    sourceEnvName: string,
    inputs: Inputs,
    core: FxCore
  ): Promise<Result<Void, FxError>> {
    // copy env config file
    const targetEnvConfigFilePath = environmentManager.getEnvConfigPath(
      targetEnvName,
      inputs.projectPath!
    );
    const sourceEnvConfigFilePath = environmentManager.getEnvConfigPath(
      sourceEnvName,
      inputs.projectPath!
    );

    try {
      await fs.copy(sourceEnvConfigFilePath, targetEnvConfigFilePath);
    } catch (e) {
      return err(CopyFileError(e as Error));
    }

    TOOLS.logProvider.debug(
      `[core] copy env config file for ${targetEnvName} environment to path ${targetEnvConfigFilePath}`
    );

    return ok(Void);
  }

  // deprecated
  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    SolutionLoaderMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
  ])
  async activateEnv(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    const env = inputs.env;
    if (!env) {
      return err(new ObjectIsUndefinedError("env"));
    }
    if (!ctx!.projectSettings) {
      return ok(Void);
    }

    const envConfigs = await environmentManager.listRemoteEnvConfigs(inputs.projectPath!);

    if (envConfigs.isErr()) {
      return envConfigs;
    }

    if (envConfigs.isErr() || envConfigs.value.indexOf(env) < 0) {
      return err(NonExistEnvNameError(env));
    }

    const core = ctx!.self as FxCore;
    const solutionContext = await loadSolutionContext(inputs, ctx!.projectSettings, env);

    if (!solutionContext.isErr()) {
      ctx!.provisionInputConfig = solutionContext.value.envInfo.config;
      ctx!.provisionOutputs = solutionContext.value.envInfo.state;
      ctx!.envName = solutionContext.value.envInfo.envName;
    }

    this.tools.ui.showMessage("info", `[${env}] is activated.`, false);
    return ok(Void);
  }

  async _init(
    inputs: v2.InputsWithProjectPath,
    ctx?: CoreHookContext
  ): Promise<Result<Void, FxError>> {
    if (!ctx) {
      return err(new ObjectIsUndefinedError("ctx for createProject"));
    }
    // validate app name
    const appName = inputs[QuestionAppName.name] as string;
    const validateResult = jsonschema.validate(appName, {
      pattern: ProjectNamePattern,
    });
    if (validateResult.errors && validateResult.errors.length > 0) {
      return err(InvalidInputError("invalid app-name", inputs));
    }

    // create ProjectSettings
    const projectSettings = newProjectSettings();
    projectSettings.appName = appName;
    ctx.projectSettings = projectSettings;

    // create folder structure
    await fs.ensureDir(path.join(inputs.projectPath, `.${ConfigFolderName}`));
    await fs.ensureDir(path.join(inputs.projectPath, "templates", `${AppPackageFolderName}`));
    const basicFolderRes = await createBasicFolderStructure(inputs);
    if (basicFolderRes.isErr()) {
      return err(basicFolderRes.error);
    }

    // create contextV2
    const context = createV2Context(projectSettings);
    ctx.contextV2 = context;

    const appStudioV3 = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);

    // init manifest
    const manifestInitRes = await appStudioV3.init(context, inputs);
    if (manifestInitRes.isErr()) return err(manifestInitRes.error);

    if (inputs.existingAppConfig?.isCreatedFromExistingApp) {
      const newEnvConfig = environmentManager.newEnvConfigData(appName, inputs.existingAppConfig);
      const writeEnvResult = await environmentManager.writeEnvConfig(
        inputs.projectPath,
        newEnvConfig,
        environmentManager.getDefaultEnvName()
      );
      if (writeEnvResult.isErr()) {
        return err(writeEnvResult.error);
      }
      // call App Studio V3 API to create manifest with placeholder
      const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
      const contextV2 = createV2Context(projectSettings);
      const initRes = await appStudio.init(contextV2, inputs as v2.InputsWithProjectPath);
      if (initRes.isErr()) return err(initRes.error);
      const manifestCaps: v3.ManifestCapability[] = [];
      inputs.existingAppConfig.newAppTypes.forEach((t) => {
        if (t === ExistingTeamsAppType.Bot) manifestCaps.push({ name: "Bot", existingApp: true });
        else if (t === ExistingTeamsAppType.StaticTab)
          manifestCaps.push({ name: "staticTab", existingApp: true });
        else if (t === ExistingTeamsAppType.ConfigurableTab)
          manifestCaps.push({ name: "configurableTab", existingApp: true });
        else if (t === ExistingTeamsAppType.MessageExtension)
          manifestCaps.push({ name: "MessageExtension", existingApp: true });
      });
      const addCapabilitiesRes = await appStudio.addCapabilities(
        contextV2,
        inputs as v2.InputsWithProjectPath,
        manifestCaps
      );
      if (addCapabilitiesRes.isErr()) return err(addCapabilitiesRes.error);
    } else {
      const createEnvResult = await this.createEnvWithName(
        environmentManager.getDefaultEnvName(),
        projectSettings,
        inputs
      );
      if (createEnvResult.isErr()) {
        return err(createEnvResult.error);
      }
    }
    const createLocalEnvResult = await this.createEnvWithName(
      environmentManager.getLocalEnvName(),
      projectSettings,
      inputs
    );
    if (createLocalEnvResult.isErr()) {
      return err(createLocalEnvResult.error);
    }
    return ok(Void);
  }
  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
  ])
  async init(
    inputs: v2.InputsWithProjectPath,
    ctx?: CoreHookContext
  ): Promise<Result<Void, FxError>> {
    return this._init(inputs, ctx);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectSettingsLoaderMW,
    SolutionLoaderMW_V3,
    EnvInfoLoaderMW_V3(false),
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
  ])
  async addFeature(
    inputs: v2.InputsWithProjectPath,
    ctx?: CoreHookContext
  ): Promise<Result<Void, FxError>> {
    return this._addFeature(inputs, ctx);
  }

  async _addFeature(
    inputs: v2.InputsWithProjectPath,
    ctx?: CoreHookContext
  ): Promise<Result<Void, FxError>> {
    if (ctx && ctx.solutionV3 && ctx.contextV2 && ctx.solutionV3.addFeature) {
      return await ctx.solutionV3.addFeature(ctx.contextV2, inputs as v3.SolutionAddFeatureInputs);
    }
    return ok(Void);
  }

  //V1,V2 questions
  _getQuestionsForCreateProjectV2 = getQuestionsForCreateProjectV2;
  _getQuestionsForCreateProjectV3 = getQuestionsForCreateProjectV3;
  _getQuestionsForUserTask = getQuestionsForUserTaskV2;
  _getQuestions = getQuestionsV2;
  //v3 questions
  _getQuestionsForAddFeature = getQuestionsForAddFeature;
  _getQuestionsForProvision = getQuestionsForProvision;
  _getQuestionsForDeploy = getQuestionsForDeploy;
  _getQuestionsForPublish = getQuestionsForPublish;
  _getQuestionsForInit = getQuestionsForInit;
  _getQuestionsForUserTaskV3 = getQuestionsForUserTaskV3;
}

export async function createBasicFolderStructure(inputs: Inputs): Promise<Result<null, FxError>> {
  if (!inputs.projectPath) {
    return err(new ObjectIsUndefinedError("projectPath"));
  }
  try {
    const appName = inputs[QuestionAppName.name] as string;
    if (inputs.platform !== Platform.VS) {
      await fs.writeFile(
        path.join(inputs.projectPath, `package.json`),
        JSON.stringify(
          {
            name: appName,
            version: "0.0.1",
            description: "",
            author: "",
            scripts: {
              test: 'echo "Error: no test specified" && exit 1',
            },
            devDependencies: {
              "@microsoft/teamsfx-cli": "0.*",
            },
            license: "MIT",
          },
          null,
          4
        )
      );
    }
    await fs.writeFile(
      path.join(inputs.projectPath!, `.gitignore`),
      [
        "node_modules",
        `.${ConfigFolderName}/${InputConfigsFolderName}/${localSettingsFileName}`,
        `.${ConfigFolderName}/${StatesFolderName}/*.userdata`,
        ".DS_Store",
        ".env.teamsfx.local",
        "subscriptionInfo.json",
        BuildFolderName,
      ].join("\n")
    );
  } catch (e) {
    return err(WriteFileError(e));
  }
  return ok(null);
}

export function newProjectSettings(): ProjectSettings {
  const projectSettings: ProjectSettings = {
    appName: "",
    projectId: uuid.v4(),
    version: getProjectSettingsVersion(),
  };
  return projectSettings;
}

export function createV2Context(projectSettings: ProjectSettings): v2.Context {
  const context: v2.Context = {
    userInteraction: TOOLS.ui,
    logProvider: TOOLS.logProvider,
    telemetryReporter: TOOLS.telemetryReporter!,
    cryptoProvider: new LocalCrypto(projectSettings.projectId),
    permissionRequestProvider: TOOLS.permissionRequest,
    projectSetting: projectSettings,
  };
  return context;
}

export function undefinedName(objs: any[], names: string[]) {
  for (let i = 0; i < objs.length; ++i) {
    if (objs[i] === undefined) {
      return names[i];
    }
  }
  return undefined;
}

export function getProjectSettingsVersion() {
  return "2.1.0";
}

export * from "./error";
export * from "./tools";
export * from "./downloadSample";
