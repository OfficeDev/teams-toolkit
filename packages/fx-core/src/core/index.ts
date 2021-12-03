// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, hooks } from "@feathersjs/hooks";
import {
  AppPackageFolderName,
  ArchiveFolderName,
  ArchiveLogFileName,
  assembleError,
  ConfigFolderName,
  Core,
  CoreCallbackEvent,
  CoreCallbackFunc,
  err,
  Func,
  FunctionRouter,
  FxError,
  InputConfigsFolderName,
  Inputs,
  Json,
  LogProvider,
  ok,
  Platform,
  ProjectConfig,
  ProjectSettings,
  StatesFolderName,
  QTreeNode,
  Result,
  SingleSelectQuestion,
  Solution,
  SolutionConfig,
  SolutionContext,
  Stage,
  SystemError,
  TelemetryReporter,
  Tools,
  UserCancelError,
  v2,
  Void,
  BuildFolderName,
} from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import * as fs from "fs-extra";
import * as jsonschema from "jsonschema";
import * as path from "path";
import * as uuid from "uuid";
import { environmentManager, sampleProvider } from "..";
import { FeatureFlagName } from "../common/constants";
import { globalStateUpdate } from "../common/globalState";
import { localSettingsFileName } from "../common/localSettingsProvider";
import {
  Component,
  sendTelemetryEvent,
  sendTelemetryErrorEvent,
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../common/telemetry";
import {
  downloadSampleHook,
  fetchCodeZip,
  isFeatureFlagEnabled,
  isMultiEnvEnabled,
  mapToJson,
  saveFilesRecursively,
  getRootDirectory,
} from "../common/tools";
import { PluginNames } from "../plugins";
import { getAllV2ResourcePlugins } from "../plugins/solution/fx-solution/ResourcePluginContainer";
import { CallbackRegistry } from "./callback";
import {
  ArchiveProjectError,
  ArchiveUserFileError,
  CopyFileError,
  CoreSource,
  FunctionRouterError,
  InvalidInputError,
  LoadSolutionError,
  MigrateNotImplementError,
  NonExistEnvNameError,
  ObjectIsUndefinedError,
  ProjectFolderExistError,
  ProjectFolderNotExistError,
  TaskNotSupportError,
  WriteFileError,
} from "./error";
import { ConcurrentLockerMW } from "./middleware/concurrentLocker";
import { ContextInjectorMW } from "./middleware/contextInjector";
import {
  askNewEnvironment,
  EnvInfoLoaderMW,
  loadSolutionContext,
  upgradeDefaultFunctionName,
  upgradeProgrammingLanguage,
} from "./middleware/envInfoLoader";
import { EnvInfoWriterMW } from "./middleware/envInfoWriter";
import { ErrorHandlerMW } from "./middleware/errorHandler";
import { LocalSettingsLoaderMW } from "./middleware/localSettingsLoader";
import { LocalSettingsWriterMW } from "./middleware/localSettingsWriter";
import { MigrateConditionHandlerMW } from "./middleware/migrateConditionHandler";
import { ProjectMigratorMW } from "./middleware/projectMigrator";
import {
  loadProjectSettings,
  newSolutionContext,
  ProjectSettingsLoaderMW,
} from "./middleware/projectSettingsLoader";
import { ProjectSettingsWriterMW } from "./middleware/projectSettingsWriter";
import { ProjectUpgraderMW } from "./middleware/projectUpgrader";
import { QuestionModelMW } from "./middleware/questionModel";
import { SolutionLoaderMW } from "./middleware/solutionLoader";
import {
  CoreQuestionNames,
  DefaultAppNameFunc,
  getCreateNewOrFromSampleQuestion,
  ProjectNamePattern,
  QuestionAppName,
  QuestionRootFolder,
  QuestionSelectSolution,
  QuestionV1AppName,
  SampleSelect,
  ScratchOptionNo,
  ScratchOptionYes,
} from "./question";
import {
  getAllSolutionPlugins,
  getAllSolutionPluginsV2,
  getSolutionPluginByName,
  getSolutionPluginV2ByName,
} from "./SolutionPluginContainer";
import { flattenConfigJson, newEnvInfo } from "./tools";
import { LocalCrypto } from "./crypto";
import { SupportV1ConditionMW } from "./middleware/supportV1ConditionHandler";
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
}

function featureFlagEnabled(flagName: string): boolean {
  const flag = process.env[flagName];
  if (flag !== undefined && flag.toLowerCase() === "true") {
    return true;
  } else {
    return false;
  }
}

// API V2 feature flag
export function isV2() {
  return featureFlagEnabled(FeatureFlagName.APIV2);
}

// On VS calling CLI, interactive questions need to be skipped.
export function isVsCallingCli() {
  return featureFlagEnabled(FeatureFlagName.VSCallingCLI);
}

export let Logger: LogProvider;
export let telemetryReporter: TelemetryReporter | undefined;
export let currentStage: Stage;
export let TOOLS: Tools;
export class FxCore implements Core {
  tools: Tools;
  isFromSample?: boolean;
  createdFrom?: string;

  constructor(tools: Tools) {
    this.tools = tools;
    TOOLS = tools;
    Logger = tools.logProvider;
    telemetryReporter = tools.telemetryReporter;
  }

  /**
   * @todo this's a really primitive implement. Maybe could use Subscription Model to
   * refactor later.
   */
  public on(event: CoreCallbackEvent, callback: CoreCallbackFunc): void {
    return CallbackRegistry.set(event, callback);
  }

  @hooks([
    ErrorHandlerMW,
    SupportV1ConditionMW(true),
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(true),
  ])
  async createProject(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<string, FxError>> {
    if (!ctx) {
      return err(new ObjectIsUndefinedError("ctx for createProject"));
    }
    currentStage = Stage.create;
    inputs.stage = Stage.create;
    let folder = inputs[QuestionRootFolder.name] as string;
    if (inputs.platform === Platform.VSCode) {
      folder = getRootDirectory();
      await fs.ensureDir(folder);
    }
    const scratch = inputs[CoreQuestionNames.CreateFromScratch] as string;
    let projectPath: string;
    let globalStateDescription = "openReadme";
    const multiEnv = isMultiEnvEnabled();
    if (scratch === ScratchOptionNo.id) {
      // create from sample
      const downloadRes = await downloadSample(this, inputs, ctx);
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
      await fs.ensureDir(
        path.join(
          projectPath,
          multiEnv ? path.join("templates", `${AppPackageFolderName}`) : `${AppPackageFolderName}`
        )
      );
      const basicFolderRes = await createBasicFolderStructure(inputs);
      if (basicFolderRes.isErr()) {
        return err(basicFolderRes.error);
      }

      const projectSettings: ProjectSettings = {
        appName: appName,
        projectId: inputs.projectId ? inputs.projectId : uuid.v4(),
        solutionSettings: {
          name: "",
          version: "1.0.0",
        },
        version: getProjectSettingsVersion(),
        isFromSample: false,
        createdFrom: corePackage.version,
      };
      ctx.projectSettings = projectSettings;
      if (multiEnv) {
        const createEnvResult = await this.createEnvWithName(
          environmentManager.getDefaultEnvName(),
          projectSettings,
          inputs
        );
        if (createEnvResult.isErr()) {
          return err(createEnvResult.error);
        }
      }

      if (isV2()) {
        const solution = await getSolutionPluginV2ByName(inputs[CoreQuestionNames.Solution]);
        if (!solution) {
          return err(new LoadSolutionError());
        }
        ctx.solutionV2 = solution;
        projectSettings.solutionSettings.name = solution.name;
        const contextV2 = createV2Context(this, projectSettings);
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
        if (multiEnv) {
          if (solution.createEnv) {
            inputs.copy = false;
            const createEnvRes = await solution.createEnv(contextV2, inputs);
            if (createEnvRes.isErr()) {
              return err(createEnvRes.error);
            }
          }
        } else {
          //TODO lagacy env.default.json
          const state: Json = { solution: {} };
          for (const plugin of getAllV2ResourcePlugins()) {
            state[plugin.name] = {};
          }
          state[PluginNames.LDEBUG]["trustDevCert"] = "true";
          ctx.envInfoV2 = {
            envName: environmentManager.getDefaultEnvName(),
            config: {},
            state: state,
          };
        }
      } else {
        const solution = await getSolutionPluginByName(inputs[CoreQuestionNames.Solution]);
        if (!solution) {
          return err(new LoadSolutionError());
        }
        ctx.solution = solution;
        projectSettings.solutionSettings.name = solution.name;
        const solutionContext: SolutionContext = {
          projectSettings: projectSettings,
          envInfo: newEnvInfo(),
          root: projectPath,
          ...this.tools,
          ...this.tools.tokenProvider,
          answers: inputs,
          cryptoProvider: new LocalCrypto(projectSettings.projectId),
        };
        ctx.solutionContext = solutionContext;
        const createRes = await solution.create(solutionContext);
        if (createRes.isErr()) {
          return createRes;
        }
        const scaffoldRes = await solution.scaffold(solutionContext);
        if (scaffoldRes.isErr()) {
          return scaffoldRes;
        }
        if (multiEnv) {
          if (solution.createEnv) {
            solutionContext.answers!.copy = false;
            const createEnvRes = await solution.createEnv(solutionContext);
            if (createEnvRes.isErr()) {
              return err(createEnvRes.error);
            }
          }
        }
      }
    }

    if (inputs.platform === Platform.VSCode) {
      await globalStateUpdate(globalStateDescription, true);
    }
    return ok(projectPath);
  }

  @hooks([
    ErrorHandlerMW,
    SupportV1ConditionMW(true),
    MigrateConditionHandlerMW,
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(true),
  ])
  async migrateV1Project(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<string, FxError>> {
    currentStage = Stage.migrateV1;
    inputs.stage = Stage.migrateV1;
    const globalStateDescription = "openReadme";

    const appName = (inputs[DefaultAppNameFunc.name] ?? inputs[QuestionV1AppName.name]) as string;
    if (undefined === appName) return err(InvalidInputError(`App Name is empty`, inputs));

    const validateResult = jsonschema.validate(appName, {
      pattern: ProjectNamePattern,
    });
    if (validateResult.errors && validateResult.errors.length > 0) {
      return err(InvalidInputError(`${validateResult.errors[0].message}`, inputs));
    }

    const projectPath = inputs.projectPath;

    if (!projectPath || !(await fs.pathExists(projectPath))) {
      return err(ProjectFolderNotExistError(projectPath ?? ""));
    }

    const solution = await getAllSolutionPlugins()[0];
    const projectSettings: ProjectSettings = {
      appName: appName,
      projectId: uuid.v4(),
      solutionSettings: {
        name: solution.name,
        version: "1.0.0",
        migrateFromV1: true,
      },
    };

    const solutionContext: SolutionContext = {
      projectSettings: projectSettings,
      envInfo: newEnvInfo(),
      root: projectPath,
      ...this.tools,
      ...this.tools.tokenProvider,
      answers: inputs,
      cryptoProvider: new LocalCrypto(projectSettings.projectId),
    };

    const archiveResult = await this.archive(projectPath);
    if (archiveResult.isErr()) {
      return err(archiveResult.error);
    }

    await fs.ensureDir(projectPath);
    await fs.ensureDir(path.join(projectPath, `.${ConfigFolderName}`));

    const createResult = await createBasicFolderStructure(inputs);
    if (createResult.isErr()) {
      return err(createResult.error);
    }

    if (!solution.migrate) {
      return err(MigrateNotImplementError(projectPath));
    }
    const migrateV1Res = await solution.migrate(solutionContext);
    if (migrateV1Res.isErr()) {
      return migrateV1Res;
    }

    ctx!.solution = solution;
    ctx!.solutionContext = solutionContext;
    ctx!.projectSettings = projectSettings;

    if (inputs.platform === Platform.VSCode) {
      await globalStateUpdate(globalStateDescription, true);
    }
    this._setEnvInfoV2(ctx);
    return ok(projectPath);
  }

  async archive(projectPath: string): Promise<Result<Void, FxError>> {
    try {
      const archiveFolderPath = path.join(projectPath, ArchiveFolderName);
      await fs.ensureDir(archiveFolderPath);

      const fileNames = await fs.readdir(projectPath);
      const archiveLog = async (projectPath: string, message: string): Promise<void> => {
        await fs.appendFile(
          path.join(projectPath, ArchiveLogFileName),
          `[${new Date().toISOString()}] ${message}\n`
        );
      };

      await archiveLog(projectPath, `Start to move files into '${ArchiveFolderName}' folder.`);
      for (const fileName of fileNames) {
        if (fileName === ArchiveFolderName || fileName === ArchiveLogFileName) {
          continue;
        }

        try {
          await fs.move(path.join(projectPath, fileName), path.join(archiveFolderPath, fileName), {
            overwrite: true,
          });
        } catch (e: any) {
          await archiveLog(projectPath, `Failed to move '${fileName}'. ${e.message}`);
          return err(ArchiveUserFileError(fileName, e.message));
        }

        await archiveLog(
          projectPath,
          `'${fileName}' has been moved to '${ArchiveFolderName}' folder.`
        );
      }
      return ok(Void);
    } catch (e: any) {
      return err(ArchiveProjectError(e.message));
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(false),
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async provisionResources(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    currentStage = Stage.provision;
    inputs.stage = Stage.provision;
    // provision is not ready yet, so use API v1
    if (isV2()) {
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
      if (result.kind === "success") {
        // Remove all "output" and "secret" fields for backward compatibility.
        // todo(yefuwang): handle "output" and "secret" fields in middlewares.
        const state = flattenConfigJson(result.output);
        ctx.envInfoV2.state = { ...ctx.envInfoV2.state, ...state };
        return ok(Void);
      } else if (result.kind === "partialSuccess") {
        const state = flattenConfigJson(result.output);
        ctx.envInfoV2.state = { ...ctx.envInfoV2.state, ...state };
        return err(result.error);
      } else {
        return err(result.error);
      }
    } else {
      if (!ctx || !ctx.solution || !ctx.solutionContext) {
        const name = undefinedName(
          [ctx, ctx?.solution, ctx?.solutionContext],
          ["ctx", "ctx.solution", "ctx.solutionContext"]
        );
        return err(new ObjectIsUndefinedError(`Provision input stuff: ${name}`));
      }
      const provisionRes = await ctx.solution.provision(ctx.solutionContext);
      if (provisionRes.isErr()) {
        return provisionRes;
      }
      this._setEnvInfoV2(ctx);
      return provisionRes;
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(false),
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async deployArtifacts(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    currentStage = Stage.deploy;
    inputs.stage = Stage.deploy;
    if (isV2()) {
      if (!ctx || !ctx.solutionV2 || !ctx.contextV2 || !ctx.envInfoV2) {
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
          ctx.envInfoV2.state,
          this.tools.tokenProvider.azureAccountProvider
        );
      else return ok(Void);
    } else {
      if (!ctx || !ctx.solution || !ctx.solutionContext) {
        const name = undefinedName(
          [ctx, ctx?.solution, ctx?.solutionContext],
          ["ctx", "ctx.solution", "ctx.solutionContext"]
        );
        return err(new ObjectIsUndefinedError(`Deploy input stuff: ${name}`));
      }
      return await ctx.solution.deploy(ctx.solutionContext);
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(true),
    ProjectMigratorMW,
    ProjectUpgraderMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(true),
    LocalSettingsLoaderMW,
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(true),
    LocalSettingsWriterMW,
  ])
  async localDebug(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    currentStage = Stage.debug;
    inputs.stage = Stage.debug;
    if (isV2()) {
      if (isMultiEnvEnabled()) {
        if (!ctx || !ctx.solutionV2 || !ctx.contextV2) {
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
            this.tools.tokenProvider
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
    }
    if (!ctx || !ctx.solution || !ctx.solutionContext || !ctx.projectSettings) {
      const name = undefinedName(
        [ctx, ctx?.solution, ctx?.solutionContext, ctx?.projectSettings],
        ["ctx", "ctx.solution", "ctx.solutionContext", "ctx.projectSettings"]
      );
      return err(new ObjectIsUndefinedError(`localDebug input stuff (${name})`));
    }

    upgradeProgrammingLanguage(
      ctx.solutionContext.envInfo.state as SolutionConfig,
      ctx.projectSettings
    );
    upgradeDefaultFunctionName(
      ctx.solutionContext.envInfo.state as SolutionConfig,
      ctx.projectSettings
    );
    const res = await ctx.solution.localDebug(ctx.solutionContext);
    this._setEnvInfoV2(ctx);
    return res;
  }

  _setEnvInfoV2(ctx?: CoreHookContext) {
    if (isV2() && ctx && ctx.solutionContext) {
      //workaround, compatible to api v2
      ctx.envInfoV2 = {
        envName: ctx.solutionContext.envInfo.envName,
        config: ctx.solutionContext.envInfo.config,
        state: {},
      };
      ctx.envInfoV2.state = mapToJson(ctx.solutionContext.envInfo.state);
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(false),
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async publishApplication(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    currentStage = Stage.publish;
    inputs.stage = Stage.publish;
    if (isV2()) {
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
    } else {
      if (!ctx || !ctx.solution || !ctx.solutionContext) {
        const name = undefinedName(
          [ctx, ctx?.solution, ctx?.solutionContext],
          ["ctx", "ctx.solution", "ctx.solutionContext"]
        );
        return err(new ObjectIsUndefinedError(`publish input stuff: ${name}`));
      }
      return await ctx.solution.publish(ctx.solutionContext);
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(false),
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    LocalSettingsLoaderMW,
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
    LocalSettingsWriterMW,
  ])
  async executeUserTask(
    func: Func,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<unknown, FxError>> {
    currentStage = Stage.userTask;
    inputs.stage = Stage.userTask;
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if ("" !== namespace && array.length > 0) {
      if (isV2()) {
        if (!ctx || !ctx.solutionV2 || !ctx.envInfoV2) {
          const name = undefinedName(
            [ctx, ctx?.solutionV2, ctx?.envInfoV2],
            ["ctx", "ctx.solutionV2", "ctx.envInfoV2"]
          );
          return err(new ObjectIsUndefinedError(`executeUserTask input stuff: ${name}`));
        }
        if (!ctx.contextV2) ctx.contextV2 = createV2Context(this, newProjectSettings());
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
      } else {
        if (!ctx || !ctx.solution)
          return err(new ObjectIsUndefinedError("executeUserTask input stuff"));
        if (!ctx.solutionContext)
          ctx.solutionContext = await newSolutionContext(this.tools, inputs);
        if (ctx.solution.executeUserTask)
          return await ctx.solution.executeUserTask(func, ctx.solutionContext);
        else return err(FunctionRouterError(func));
      }
    }
    return err(FunctionRouterError(func));
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(true),
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(true),
    SolutionLoaderMW(),
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
      return await this._getQuestionsForCreateProject(inputs);
    } else {
      if (isV2()) {
        const contextV2 = ctx.contextV2
          ? ctx.contextV2
          : createV2Context(this, newProjectSettings());
        const solutionV2 = ctx.solutionV2 ? ctx.solutionV2 : await getAllSolutionPluginsV2()[0];
        const envInfoV2 = ctx.envInfoV2
          ? ctx.envInfoV2
          : { envName: environmentManager.getDefaultEnvName(), config: {}, state: {} };
        inputs.stage = stage;
        return await this._getQuestions(contextV2, solutionV2, stage, inputs, envInfoV2);
      } else {
        const solutionContext = ctx.solutionContext
          ? ctx.solutionContext
          : await newSolutionContext(this.tools, inputs);
        const solution = ctx.solution ? ctx.solution : getAllSolutionPlugins()[0];
        return await this._getQuestions(solutionContext, solution, stage, inputs);
      }
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(true),
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(true),
    SolutionLoaderMW(),
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
    if (isV2()) {
      const contextV2 = ctx.contextV2 ? ctx.contextV2 : createV2Context(this, newProjectSettings());
      const solutionV2 = ctx.solutionV2 ? ctx.solutionV2 : await getAllSolutionPluginsV2()[0];
      const envInfoV2 = ctx.envInfoV2
        ? ctx.envInfoV2
        : { envName: environmentManager.getDefaultEnvName(), config: {}, state: {} };
      return await this._getQuestionsForUserTask(contextV2, solutionV2, func, inputs, envInfoV2);
    } else {
      const solutionContext = ctx.solutionContext
        ? ctx.solutionContext
        : await newSolutionContext(this.tools, inputs);
      const solution = ctx.solution ? ctx.solution : getAllSolutionPlugins()[0];
      return await this._getQuestionsForUserTask(solutionContext, solution, func, inputs);
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(true),
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
    if (isV2()) {
      return ok({
        settings: ctx!.projectSettings,
        config: ctx!.envInfoV2?.state,
        localSettings: ctx!.localSettings,
      });
    } else {
      return ok({
        settings: ctx!.projectSettings,
        config: ctx!.solutionContext?.envInfo.state,
        localSettings: ctx!.solutionContext?.localSettings,
      });
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(false),
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
  ])
  async grantPermission(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    currentStage = Stage.grantPermission;
    inputs.stage = Stage.grantPermission;
    if (!isV2()) {
      return ctx!.solution!.grantPermission!(ctx!.solutionContext!);
    } else {
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
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(false),
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
  ])
  async checkPermission(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    currentStage = Stage.checkPermission;
    inputs.stage = Stage.checkPermission;

    if (!isV2()) {
      return ctx!.solution!.checkPermission!(ctx!.solutionContext!);
    } else {
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
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(true),
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
  ])
  async listCollaborator(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    currentStage = Stage.listCollaborator;
    inputs.stage = Stage.listCollaborator;

    if (!isV2()) {
      return ctx!.solution!.listCollaborator!(ctx!.solutionContext!);
    } else {
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
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(true),
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(true),
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
  ])
  async listAllCollaborators(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    currentStage = Stage.listAllCollaborators;
    inputs.stage = Stage.listAllCollaborators;
    if (!isV2()) {
      return ctx!.solution!.listAllCollaborators!(ctx!.solutionContext!);
    } else {
      const projectPath = inputs.projectPath;
      if (!projectPath) {
        return err(new ObjectIsUndefinedError("projectPath"));
      }
      return ctx!.solutionV2!.listAllCollaborators!(
        ctx!.contextV2!,
        { ...inputs, projectPath: projectPath },
        ctx!.envInfoV2!,
        this.tools.tokenProvider
      );
    }
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
    if (!isMultiEnvEnabled()) {
      return err(new TaskNotSupportError("getSelectedEnv"));
    }
    if (isV2()) {
      return ok(ctx?.envInfoV2?.envName);
    } else {
      return ok(ctx?.solutionContext?.envInfo.envName);
    }
  }

  async _getQuestionsForUserTask(
    ctx: SolutionContext | v2.Context,
    solution: Solution | v2.SolutionPlugin,
    func: FunctionRouter,
    inputs: Inputs,
    envInfo?: v2.EnvInfoV2
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if (namespace && "" !== namespace && array.length > 0) {
      let res: Result<QTreeNode | undefined, FxError> = ok(undefined);
      if (isV2()) {
        const solutionV2 = solution as v2.SolutionPlugin;
        if (solutionV2.getQuestionsForUserTask) {
          res = await solutionV2.getQuestionsForUserTask(
            ctx as v2.Context,
            inputs,
            func,
            envInfo!,
            this.tools.tokenProvider
          );
        }
      } else {
        const solutionv1 = solution as Solution;
        if (solutionv1.getQuestionsForUserTask) {
          res = await solutionv1.getQuestionsForUserTask(func, ctx as SolutionContext);
        }
      }
      if (res.isOk()) {
        if (res.value) {
          const node = res.value.trim();
          return ok(node);
        }
      }
      return res;
    }
    return err(FunctionRouterError(func));
  }

  async _getQuestionsForMigrateV1Project(
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const node = new QTreeNode({ type: "group" });
    const globalSolutions: Solution[] = await getAllSolutionPlugins();
    const solutionContext = await newSolutionContext(this.tools, inputs);

    for (const v of globalSolutions) {
      if (v.getQuestions) {
        const res = await v.getQuestions(Stage.migrateV1, solutionContext);
        if (res.isErr()) return res;
        if (res.value) {
          const solutionNode = res.value as QTreeNode;
          solutionNode.condition = { equals: v.name };
          if (solutionNode.data) node.addChild(solutionNode);
        }
      }
    }

    const defaultAppNameFunc = new QTreeNode(DefaultAppNameFunc);
    node.addChild(defaultAppNameFunc);

    const appNameQuestion = new QTreeNode(QuestionV1AppName);
    appNameQuestion.condition = {
      validFunc: (input: any) => (!input ? undefined : "App name is auto generated."),
    };
    defaultAppNameFunc.addChild(appNameQuestion);
    return ok(node.trim());
  }

  async _getQuestions(
    ctx: SolutionContext | v2.Context,
    solution: Solution | v2.SolutionPlugin,
    stage: Stage,
    inputs: Inputs,
    envInfo?: v2.EnvInfoV2
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    if (stage !== Stage.create) {
      let res: Result<QTreeNode | undefined, FxError> = ok(undefined);
      if (isV2()) {
        const solutionV2 = solution as v2.SolutionPlugin;
        if (solutionV2.getQuestions) {
          inputs.stage = stage;
          res = await solutionV2.getQuestions(
            ctx as v2.Context,
            inputs,
            envInfo!,
            this.tools.tokenProvider
          );
        }
      } else {
        res = await (solution as Solution).getQuestions(stage, ctx as SolutionContext);
      }
      if (res.isErr()) return res;
      if (res.value) {
        const node = res.value as QTreeNode;
        if (node.data) {
          return ok(node.trim());
        }
      }
    }
    return ok(undefined);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(true),
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
    if (isV2()) {
      if (!ctx.contextV2) return err(new ObjectIsUndefinedError("ctx.contextV2"));
      return ctx.contextV2.cryptoProvider.encrypt(plaintext);
    } else {
      if (!ctx.solutionContext) return err(new ObjectIsUndefinedError("ctx.solutionContext"));
      return ctx.solutionContext.cryptoProvider.encrypt(plaintext);
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(true),
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
    if (isV2()) {
      if (!ctx.contextV2) return err(new ObjectIsUndefinedError("ctx.contextV2"));
      return ctx.contextV2.cryptoProvider.decrypt(ciphertext);
    } else {
      if (!ctx.solutionContext) return err(new ObjectIsUndefinedError("ctx.solutionContext"));
      return ctx.solutionContext.cryptoProvider.decrypt(ciphertext);
    }
  }

  async buildArtifacts(inputs: Inputs): Promise<Result<Void, FxError>> {
    throw new TaskNotSupportError(Stage.build);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(false),
    ProjectSettingsLoaderMW,
    SolutionLoaderMW(),
    EnvInfoLoaderMW(true),
    ContextInjectorMW,
  ])
  async createEnv(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    if (!ctx) return err(new ObjectIsUndefinedError("createEnv input stuff"));
    const projectSettings = ctx.projectSettings;
    if (!isMultiEnvEnabled() || !projectSettings) {
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

    if (isV2()) {
      if (!ctx.solutionV2 || !ctx.contextV2)
        return err(new ObjectIsUndefinedError("ctx.solutionV2, ctx.contextV2"));
      if (ctx.solutionV2.createEnv) {
        inputs.copy = true;
        return await ctx.solutionV2.createEnv(ctx.contextV2, inputs);
      }
    } else {
      if (!ctx.solution || !ctx.solutionContext)
        return err(new ObjectIsUndefinedError("ctx.solution, ctx.solutionContext"));
      if (ctx.solution.createEnv) {
        ctx.solutionContext.answers!.copy = true;
        return await ctx.solution.createEnv(ctx.solutionContext);
      }
    }
    return ok(Void);
  }

  async createEnvWithName(
    targetEnvName: string,
    projectSettings: ProjectSettings,
    inputs: Inputs
  ): Promise<Result<Void, FxError>> {
    const appName = projectSettings.appName;
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

    core.tools.logProvider.debug(
      `[core] copy env config file for ${targetEnvName} environment to path ${targetEnvConfigFilePath}`
    );

    return ok(Void);
  }

  // deprecated
  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    SupportV1ConditionMW(true),
    ProjectMigratorMW,
    ProjectSettingsLoaderMW,
    SolutionLoaderMW(),
    ContextInjectorMW,
    ProjectSettingsWriterMW,
  ])
  async activateEnv(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    const env = inputs.env;
    if (!env) {
      return err(new ObjectIsUndefinedError("env"));
    }
    if (!isMultiEnvEnabled() || !ctx!.projectSettings) {
      return ok(Void);
    }

    const envConfigs = await environmentManager.listEnvConfigs(inputs.projectPath!);

    if (envConfigs.isErr()) {
      return envConfigs;
    }

    if (envConfigs.isErr() || envConfigs.value.indexOf(env) < 0) {
      return err(NonExistEnvNameError(env));
    }

    const core = ctx!.self as FxCore;
    const solutionContext = await loadSolutionContext(
      core.tools,
      inputs,
      ctx!.projectSettings,
      env
    );

    if (!solutionContext.isErr()) {
      if (isV2()) {
        //TODO core should not know the details of envInfo
        ctx!.provisionInputConfig = solutionContext.value.envInfo.config;
        ctx!.provisionOutputs = solutionContext.value.envInfo.state;
        ctx!.envName = solutionContext.value.envInfo.envName;
      } else {
        ctx!.solutionContext = solutionContext.value;
      }
    }

    this.tools.ui.showMessage("info", `[${env}] is activated.`, false);
    return ok(Void);
  }

  async _getQuestionsForCreateProject(
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const node = new QTreeNode(getCreateNewOrFromSampleQuestion(inputs.platform));
    // create new
    const createNew = new QTreeNode({ type: "group" });
    node.addChild(createNew);
    createNew.condition = { equals: ScratchOptionYes.id };
    const globalSolutions: Solution[] | v2.SolutionPlugin[] = isV2()
      ? await getAllSolutionPluginsV2()
      : await getAllSolutionPlugins();
    const solutionNames: string[] = globalSolutions.map((s) => s.name);
    const selectSolution: SingleSelectQuestion = QuestionSelectSolution;
    selectSolution.staticOptions = solutionNames;
    const solutionSelectNode = new QTreeNode(selectSolution);
    createNew.addChild(solutionSelectNode);
    const context = isV2()
      ? createV2Context(this, newProjectSettings())
      : await newSolutionContext(this.tools, inputs);
    for (const solutionPlugin of globalSolutions) {
      let res: Result<QTreeNode | undefined, FxError> = ok(undefined);
      if (isV2()) {
        const v2plugin = solutionPlugin as v2.SolutionPlugin;
        res = v2plugin.getQuestionsForScaffolding
          ? await v2plugin.getQuestionsForScaffolding(context as v2.Context, inputs)
          : ok(undefined);
      } else {
        const v1plugin = solutionPlugin as Solution;
        res = v1plugin.getQuestions
          ? await v1plugin.getQuestions(Stage.create, context as SolutionContext)
          : ok(undefined);
      }
      if (res.isErr()) return res;
      if (res.value) {
        const solutionNode = res.value as QTreeNode;
        solutionNode.condition = { equals: solutionPlugin.name };
        if (solutionNode.data) solutionSelectNode.addChild(solutionNode);
      }
    }
    if (inputs.platform !== Platform.VSCode) {
      createNew.addChild(new QTreeNode(QuestionRootFolder));
    }
    createNew.addChild(new QTreeNode(QuestionAppName));

    // create from sample
    const sampleNode = new QTreeNode(SampleSelect);
    node.addChild(sampleNode);
    sampleNode.condition = { equals: ScratchOptionNo.id };
    if (inputs.platform !== Platform.VSCode) {
      sampleNode.addChild(new QTreeNode(QuestionRootFolder));
    }
    return ok(node.trim());
  }
}

export async function createBasicFolderStructure(inputs: Inputs): Promise<Result<null, FxError>> {
  if (!inputs.projectPath) {
    return err(new ObjectIsUndefinedError("projectPath"));
  }
  try {
    const appName = inputs[QuestionAppName.name] as string;
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
    await fs.writeFile(
      path.join(inputs.projectPath!, `.gitignore`),
      isMultiEnvEnabled()
        ? [
            "node_modules",
            `.${ConfigFolderName}/${InputConfigsFolderName}/${localSettingsFileName}`,
            `.${ConfigFolderName}/${StatesFolderName}/*.userdata`,
            ".DS_Store",
            `${ArchiveFolderName}`,
            `${ArchiveLogFileName}`,
            ".env.teamsfx.local",
            "subscriptionInfo.json",
            BuildFolderName,
          ].join("\n")
        : `node_modules\n/.${ConfigFolderName}/*.env\n/.${ConfigFolderName}/*.userdata\n.DS_Store\n${ArchiveFolderName}\n${ArchiveLogFileName}`
    );
  } catch (e) {
    return err(WriteFileError(e));
  }
  return ok(null);
}
export async function downloadSample(
  fxCore: FxCore,
  inputs: Inputs,
  ctx: CoreHookContext
): Promise<Result<string, FxError>> {
  let fxError;
  const progress = fxCore.tools.ui.createProgressBar("Fetch sample app", 3);
  progress.start();
  const telemetryProperties: any = {
    [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    module: "fx-core",
  };
  try {
    let folder = inputs[QuestionRootFolder.name] as string;
    if (inputs.platform === Platform.VSCode) {
      folder = getRootDirectory();
      await fs.ensureDir(folder);
    }
    const sampleId = inputs[CoreQuestionNames.Samples] as string;
    if (!(sampleId && folder)) {
      throw InvalidInputError(`invalid answer for '${CoreQuestionNames.Samples}'`, inputs);
    }
    telemetryProperties[TelemetryProperty.SampleAppName] = sampleId;
    const samples = sampleProvider.SampleCollection.samples.filter(
      (sample) => sample.id.toLowerCase() === sampleId.toLowerCase()
    );
    if (samples.length === 0) {
      throw InvalidInputError(`invalid sample id: '${sampleId}'`, inputs);
    }
    const sample = samples[0];
    const url = sample.link as string;
    let sampleAppPath = path.resolve(folder, sampleId);
    if ((await fs.pathExists(sampleAppPath)) && (await fs.readdir(sampleAppPath)).length > 0) {
      let suffix = 1;
      while (await fs.pathExists(sampleAppPath)) {
        sampleAppPath = `${folder}/${sampleId}_${suffix++}`;
      }
    }
    progress.next(`Downloading from ${url}`);
    const fetchRes = await fetchCodeZip(url);
    if (fetchRes === undefined) {
      throw new SystemError(
        "FetchSampleError",
        "Fetch sample app error: empty zip file",
        CoreSource
      );
    }
    progress.next("Unzipping the sample package");
    await saveFilesRecursively(new AdmZip(fetchRes.data), sampleId, sampleAppPath);
    await downloadSampleHook(sampleId, sampleAppPath);
    progress.next("Update project settings");
    const loadInputs: Inputs = {
      ...inputs,
      projectPath: sampleAppPath,
    };
    const projectSettingsRes = await loadProjectSettings(loadInputs, isMultiEnvEnabled());
    if (projectSettingsRes.isOk()) {
      const projectSettings = projectSettingsRes.value;
      projectSettings.projectId = inputs.projectId ? inputs.projectId : uuid.v4();
      inputs.projectId = projectSettings.projectId;
      telemetryProperties[TelemetryProperty.ProjectId] = projectSettings.projectId;
      ctx.projectSettings = projectSettings;
      inputs.projectPath = sampleAppPath;
    }
    progress.end(true);
    sendTelemetryEvent(Component.core, TelemetryEvent.DownloadSample, telemetryProperties);
    return ok(sampleAppPath);
  } catch (e) {
    fxError = assembleError(e);
    progress.end(false);
    telemetryProperties[TelemetryProperty.Success] = TelemetrySuccess.No;
    sendTelemetryErrorEvent(
      Component.core,
      TelemetryEvent.DownloadSample,
      fxError,
      telemetryProperties
    );
    return err(fxError);
  }
}

export function newProjectSettings(): ProjectSettings {
  const projectSettings: ProjectSettings = {
    appName: "",
    projectId: uuid.v4(),
    version: getProjectSettingsVersion(),
    solutionSettings: {
      name: "",
    },
  };
  return projectSettings;
}

export function createV2Context(core: FxCore, projectSettings: ProjectSettings): v2.Context {
  const context: v2.Context = {
    userInteraction: core.tools.ui,
    logProvider: core.tools.logProvider,
    telemetryReporter: core.tools.telemetryReporter!,
    cryptoProvider: new LocalCrypto(projectSettings.projectId),
    permissionRequestProvider: core.tools.permissionRequest,
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
  if (isFeatureFlagEnabled(FeatureFlagName.InsiderPreview, false)) return "2.0.0";
  else return "1.0.0";
}

export * from "./error";
export * from "./tools";
