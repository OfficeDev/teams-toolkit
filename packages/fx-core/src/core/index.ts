// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, hooks } from "@feathersjs/hooks";
import {
  AppPackageFolderName,
  ArchiveFolderName,
  ArchiveLogFileName,
  assembleError,
  AzureSolutionSettings,
  ConfigFolderName,
  Core,
  err,
  Func,
  FunctionRouter,
  FxError,
  GroupOfTasks,
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
  RunnableTask,
  SingleSelectQuestion,
  Solution,
  SolutionConfig,
  SolutionContext,
  SolutionSettings,
  Stage,
  TelemetryReporter,
  Tools,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import { AxiosResponse } from "axios";
import * as fs from "fs-extra";
import * as jsonschema from "jsonschema";
import * as path from "path";
import Container from "typedi";
import * as uuid from "uuid";
import { environmentManager } from "..";
import { globalStateUpdate } from "../common/globalState";
import {
  Component,
  sendTelemetryErrorEvent,
  sendTelemetryEvent,
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../common/telemetry";
import {
  downloadSampleHook,
  fetchCodeZip,
  isArmSupportEnabled,
  isMultiEnvEnabled,
  saveFilesRecursively,
} from "../common/tools";
import { getParameterJson } from "../plugins/solution/fx-solution/arm";
import { HostTypeOptionAzure } from "../plugins/solution/fx-solution/question";
import { LocalCrypto } from "./crypto";
import {
  FetchSampleError,
  FunctionRouterError,
  InvalidInputError,
  LoadSolutionError,
  MigrateNotImplementError,
  NonExistEnvNameError,
  NotImplementedError,
  ObjectIsUndefinedError,
  ProjectFolderExistError,
  ProjectFolderNotExistError,
  TaskNotSupportError,
  WriteFileError,
} from "./error";
import { defaultSolutionLoader } from "./loader";
import { ConcurrentLockerMW } from "./middleware/concurrentLocker";
import { ContextInjectorMW } from "./middleware/contextInjecter";
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
import { newSolutionContext, ProjectSettingsLoaderMW } from "./middleware/projectSettingsLoader";
import { ProjectSettingsWriterMW } from "./middleware/projectSettingsWriter";
import { ProjectUpgraderMW } from "./middleware/projectUpgrader";
import { QuestionModelMW } from "./middleware/questionModel";
import { SolutionLoaderMW } from "./middleware/solutionLoader";
import { PermissionRequestFileProvider } from "./permissionRequest";
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
  getSolutionPluginV2,
  SolutionPlugins,
} from "./SolutionPluginContainer";
import { newEnvInfo } from "./tools";

export interface CoreHookContext extends HookContext {
  projectSettings?: ProjectSettings;
  projectIdMissing?: boolean;
  solutionContext?: SolutionContext;
  solution?: Solution;
  //for v2 api
  contextV2?: v2.Context;
  solutionV2?: v2.SolutionPlugin;
  provisionInputConfig?: Json;
  provisionOutputs?: Json;
  envName?: string;
  localSettings?: Json;
}

// switcher
export function isV2() {
  return false;
}

export let Logger: LogProvider;
export let telemetryReporter: TelemetryReporter | undefined;
export let currentStage: Stage;
export let TOOLS: Tools;
export class FxCore implements Core {
  tools: Tools;

  constructor(tools: Tools) {
    this.tools = tools;
    TOOLS = tools;
    Logger = tools.logProvider;
    telemetryReporter = tools.telemetryReporter;
  }

  @hooks([
    ErrorHandlerMW,
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(isMultiEnvEnabled()),
  ])
  async createProject(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<string, FxError>> {
    if (!ctx) {
      return err(new ObjectIsUndefinedError("CoreHookContext"));
    }
    currentStage = Stage.create;
    const folder = inputs[QuestionRootFolder.name] as string;
    const scratch = inputs[CoreQuestionNames.CreateFromScratch] as string;
    let projectPath: string;
    let globalStateDescription = "openReadme";
    const multiEnv = isMultiEnvEnabled();
    if (scratch === ScratchOptionNo.id) {
      // create from sample
      const downloadRes = await downloadSample(this, inputs);
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

      inputs.projectPath = projectPath;

      const projectSettings: ProjectSettings = {
        appName: appName,
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "1.0.0",
        },
        version: "1.0.0",
        activeEnvironment: multiEnv ? environmentManager.getDefaultEnvName() : "default",
      };

      if (isV2()) {
        const solution = await getSolutionPluginV2(inputs[CoreQuestionNames.Solution]);
        if (!solution) {
          return err(new LoadSolutionError());
        }
        ctx.solutionV2 = solution;
        projectSettings.solutionSettings.name = solution.name;
        projectSettings.version = "2.0.0";
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
        ctx.provisionInputConfig = generateResourceTemplateRes.value;
      } else {
        const solution = await defaultSolutionLoader.loadSolution(inputs);
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
      }

      if (multiEnv) {
        const createEnvResult = await createEnvWithName(
          environmentManager.getDefaultEnvName(),
          projectSettings,
          inputs,
          this
        );
        if (createEnvResult.isErr()) {
          return err(createEnvResult.error);
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
    MigrateConditionHandlerMW,
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async migrateV1Project(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<string, FxError>> {
    currentStage = Stage.migrateV1;
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

    if (isV2()) {
      return err(new NotImplementedError("migrateV1Project"));
    }

    const solution = await defaultSolutionLoader.loadSolution(inputs);
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
    };

    await this.archive(projectPath);
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

    if (inputs.platform === Platform.VSCode) {
      await globalStateUpdate(globalStateDescription, true);
    }

    return ok(projectPath);
  }

  async archive(projectPath: string): Promise<void> {
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
        throw e;
      }

      await archiveLog(
        projectPath,
        `'${fileName}' has been moved to '${ArchiveFolderName}' folder.`
      );
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(isMultiEnvEnabled()),
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async provisionResources(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    currentStage = Stage.provision;
    if (isV2()) {
      if (!ctx || !ctx.solutionV2 || !ctx.contextV2 || !ctx.provisionInputConfig)
        return err(new ObjectIsUndefinedError("Provision input stuff"));
      return await ctx.solutionV2.provisionResources(
        ctx.contextV2,
        inputs,
        ctx.provisionInputConfig,
        this.tools.tokenProvider
      );
    } else {
      if (!ctx || !ctx.solution || !ctx.solutionContext)
        return err(new ObjectIsUndefinedError("Provision input stuff"));
      return await ctx.solution.provision(ctx.solutionContext);
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(isMultiEnvEnabled()),
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async deployArtifacts(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    currentStage = Stage.deploy;
    if (isV2()) {
      if (!ctx || !ctx.solutionV2 || !ctx.contextV2 || !ctx.provisionOutputs)
        return err(new ObjectIsUndefinedError("Deploy input stuff"));
      if (ctx.solutionV2.deploy)
        return await ctx.solutionV2.deploy(
          ctx.contextV2,
          inputs,
          ctx.provisionOutputs,
          this.tools.tokenProvider.azureAccountProvider
        );
      else return ok(Void);
    } else {
      if (!ctx || !ctx.solution || !ctx.solutionContext)
        return err(new ObjectIsUndefinedError("Deploy input stuff"));
      return await ctx.solution.deploy(ctx.solutionContext);
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectUpgraderMW,
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
  async localDebug(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    currentStage = Stage.debug;

    if (isV2()) {
      if (!ctx || !ctx.solutionV2 || !ctx.contextV2)
        return err(new ObjectIsUndefinedError("localDebug input stuff"));
      if (ctx.solutionV2.provisionLocalResource) {
        const res = await ctx.solutionV2.provisionLocalResource(
          ctx.contextV2,
          inputs,
          this.tools.tokenProvider
        );
        if (res.isOk()) {
          ctx.localSettings = res.value;
          return ok(Void);
        } else {
          return err(res.error);
        }
      } else return ok(Void);
    } else {
      if (!ctx || !ctx.solution || !ctx.solutionContext || !ctx.projectSettings)
        return err(new ObjectIsUndefinedError("localDebug input stuff"));
      upgradeProgrammingLanguage(
        ctx.solutionContext.envInfo.profile as SolutionConfig,
        ctx.projectSettings
      );
      upgradeDefaultFunctionName(
        ctx.solutionContext.envInfo.profile as SolutionConfig,
        ctx.projectSettings
      );
      return await ctx.solution.localDebug(ctx.solutionContext);
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(isMultiEnvEnabled()),
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async publishApplication(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    currentStage = Stage.publish;
    if (isV2()) {
      if (
        !ctx ||
        !ctx.solutionV2 ||
        !ctx.contextV2 ||
        !ctx.provisionOutputs ||
        !ctx.provisionInputConfig
      )
        return err(new ObjectIsUndefinedError("publish input stuff"));
      return await ctx.solutionV2.publishApplication(
        ctx.contextV2,
        inputs,
        ctx.provisionInputConfig,
        ctx.provisionOutputs,
        this.tools.tokenProvider.appStudioToken
      );
    } else {
      if (!ctx || !ctx.solution || !ctx.solutionContext)
        return err(new ObjectIsUndefinedError("publish input stuff"));
      return await ctx.solution.publish(ctx.solutionContext);
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(isMultiEnvEnabled()),
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
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if ("" !== namespace && array.length > 0) {
      if (isV2()) {
        if (!ctx || !ctx.solutionV2)
          return err(new ObjectIsUndefinedError("executeUserTask input stuff"));
        if (!ctx.contextV2) ctx.contextV2 = createV2Context(this, newProjectSettings());
        if (ctx.solutionV2.executeUserTask)
          return await ctx.solutionV2.executeUserTask(ctx.contextV2, inputs, func);
        else return err(FunctionRouterError(func));
      } else {
        if (!ctx || !ctx.solution)
          return err(new ObjectIsUndefinedError("executeUserTask input stuff"));
        if (!ctx.solutionContext)
          ctx.solutionContext = await newSolutionContext(this.tools, inputs);
        if (ctx.solution) return await ctx.solution.publish(ctx.solutionContext);
        else return err(FunctionRouterError(func));
      }
    }
    return err(FunctionRouterError(func));
  }

  @hooks([
    ErrorHandlerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW(),
    ContextInjectorMW,
    EnvInfoWriterMW(),
  ])
  async getQuestions(
    task: Stage,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    if (!ctx) return err(new ObjectIsUndefinedError("getQuestions input stuff"));
    if (task === Stage.create) {
      delete inputs.projectPath;
      return await this._getQuestionsForCreateProject(inputs);
    } else {
      if (isV2()) {
        //TODO CLI???
        return ok(undefined);
      } else {
        const solutionContext = ctx.solutionContext
          ? ctx.solutionContext
          : await newSolutionContext(this.tools, inputs);
        const solution = ctx.solution
          ? ctx.solution
          : Container.get<Solution>(SolutionPlugins.AzureTeamsSolution);
        return await this._getQuestions(solutionContext, solution, task, inputs);
      }
    }
  }

  @hooks([
    ErrorHandlerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    SolutionLoaderMW(),
    ContextInjectorMW,
    EnvInfoWriterMW(),
  ])
  async getQuestionsForUserTask(
    func: FunctionRouter,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    if (isV2()) {
      return err(new NotImplementedError("getQuestionsForUserTask"));
    }
    const solutionContext =
      ctx!.solutionContext === undefined
        ? await newSolutionContext(this.tools, inputs)
        : ctx!.solutionContext;
    const solution =
      ctx!.solution === undefined
        ? await defaultSolutionLoader.loadSolution(inputs)
        : ctx!.solution;
    return await this._getQuestionsForUserTask(solutionContext, solution, func, inputs);
  }

  @hooks([
    ErrorHandlerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(isMultiEnvEnabled()),
    LocalSettingsLoaderMW,
    ContextInjectorMW,
  ])
  async getProjectConfig(
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<ProjectConfig | undefined, FxError>> {
    if (isV2()) {
      return ok({
        settings: ctx!.projectSettings,
        config: ctx!.provisionOutputs,
        localSettings: ctx!.localSettings,
      });
    } else {
      return ok({
        settings: ctx!.projectSettings,
        config: ctx!.solutionContext?.envInfo.profile,
        localSettings: ctx!.solutionContext?.localSettings,
      });
    }
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(isMultiEnvEnabled()),
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async grantPermission(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    currentStage = Stage.grantPermission;
    return await ctx!.solution!.grantPermission!(ctx!.solutionContext!);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(isMultiEnvEnabled()),
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async checkPermission(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    currentStage = Stage.checkPermission;
    return await ctx!.solution!.checkPermission!(ctx!.solutionContext!);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(isMultiEnvEnabled()),
    SolutionLoaderMW(),
    QuestionModelMW,
    ContextInjectorMW,
    ProjectSettingsWriterMW,
    EnvInfoWriterMW(),
  ])
  async listCollaborator(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    currentStage = Stage.listCollaborator;
    return await ctx!.solution!.listCollaborator!(ctx!.solutionContext!);
  }

  async _getQuestionsForUserTask(
    ctx: SolutionContext,
    solution: Solution,
    func: FunctionRouter,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if (namespace && "" !== namespace && array.length > 0 && solution.getQuestionsForUserTask) {
      ctx!.answers = inputs;
      const res = await solution.getQuestionsForUserTask!(func, ctx!);
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
    const globalSolutions: Solution[] = await defaultSolutionLoader.loadGlobalSolutions(inputs);
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
    ctx: SolutionContext,
    solution: Solution,
    stage: Stage,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const node = new QTreeNode({ type: "group" });
    if (stage !== Stage.create) {
      const res = await solution.getQuestions(stage, ctx);
      if (res.isErr()) return res;
      if (res.value) {
        const child = res.value as QTreeNode;
        if (child.data) node.addChild(child);
      }
    }
    return ok(node.trim());
  }

  @hooks([
    ErrorHandlerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    ContextInjectorMW,
    EnvInfoWriterMW(),
  ])
  async encrypt(
    plaintext: string,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<string, FxError>> {
    return ctx!.solutionContext!.cryptoProvider!.encrypt(plaintext);
  }

  @hooks([
    ErrorHandlerMW,
    ProjectSettingsLoaderMW,
    EnvInfoLoaderMW(false),
    ContextInjectorMW,
    EnvInfoWriterMW(),
  ])
  async decrypt(
    ciphertext: string,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<string, FxError>> {
    return ctx!.solutionContext!.cryptoProvider!.decrypt(ciphertext);
  }

  async buildArtifacts(inputs: Inputs): Promise<Result<Void, FxError>> {
    throw TaskNotSupportError(Stage.build);
  }

  @hooks([ErrorHandlerMW, ProjectSettingsLoaderMW, ContextInjectorMW])
  async createEnv(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    const projectSettings = ctx!.projectSettings;
    if (!isMultiEnvEnabled() || !projectSettings) {
      return ok(Void);
    }

    const core = ctx!.self as FxCore;
    const targetEnvName = await askNewEnvironment(ctx!, inputs);

    if (!targetEnvName) {
      return ok(Void);
    }

    if (targetEnvName) {
      const createEnvResult = await createEnvWithName(targetEnvName, projectSettings, inputs, core);
      if (createEnvResult.isErr()) {
        return createEnvResult;
      }
    }

    return ok(Void);
  }

  @hooks([
    ErrorHandlerMW,
    ProjectSettingsLoaderMW,
    SolutionLoaderMW(),
    ContextInjectorMW,
    ProjectSettingsWriterMW,
  ])
  async activateEnv(
    env: string,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<Void, FxError>> {
    if (!isMultiEnvEnabled() || !ctx!.projectSettings) {
      return ok(Void);
    }

    const envConfigs = await environmentManager.listEnvConfigs(inputs.projectPath!);

    if (envConfigs.isErr()) {
      return envConfigs;
    }

    if (envConfigs.isErr() && envConfigs.value.indexOf(env) < 0) {
      return err(NonExistEnvNameError(env));
    }

    ctx!.projectSettings.activeEnvironment = env;
    const core = ctx!.self as FxCore;
    const solutionContext = await loadSolutionContext(
      core.tools,
      inputs,
      ctx!.projectSettings,
      ctx!.projectIdMissing,
      env
    );

    if (!solutionContext.isErr()) {
      if (isV2()) {
        //TODO core should not know the details of envInfo
        ctx!.provisionInputConfig = solutionContext.value.envInfo.config;
        ctx!.provisionOutputs = solutionContext.value.envInfo.profile;
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
    createNew.addChild(new QTreeNode(QuestionRootFolder));
    createNew.addChild(new QTreeNode(QuestionAppName));

    // create from sample
    const sampleNode = new QTreeNode(SampleSelect);
    node.addChild(sampleNode);
    sampleNode.condition = { equals: ScratchOptionNo.id };
    sampleNode.addChild(new QTreeNode(QuestionRootFolder));
    return ok(node.trim());
  }

  async removeEnv(inputs: Inputs): Promise<Result<Void, FxError>> {
    throw TaskNotSupportError(Stage.removeEnv);
  }
  async switchEnv(inputs: Inputs): Promise<Result<Void, FxError>> {
    throw TaskNotSupportError(Stage.switchEnv);
  }
}

function isAzureProject(solutionSettings: SolutionSettings): boolean {
  const settings = solutionSettings as AzureSolutionSettings;
  return settings?.hostType === HostTypeOptionAzure.id;
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
      path.join(inputs.projectPath, `.gitignore`),
      `node_modules\n/.${ConfigFolderName}/*.env\n/.${ConfigFolderName}/*.userdata\n.DS_Store\n${ArchiveFolderName}\n${ArchiveLogFileName}`
    );
  } catch (e) {
    return err(WriteFileError(e));
  }
  return ok(null);
}
export async function downloadSample(
  fxcore: FxCore,
  inputs: Inputs
): Promise<Result<string, FxError>> {
  const folder = inputs[QuestionRootFolder.name] as string;
  const sample = inputs[CoreQuestionNames.Samples] as OptionItem;
  if (sample && sample.data && folder) {
    const url = sample.data as string;
    const sampleId = sample.id;
    const sampleAppPath = path.resolve(folder, sampleId);
    if ((await fs.pathExists(sampleAppPath)) && (await fs.readdir(sampleAppPath)).length > 0) {
      return err(ProjectFolderExistError(sampleAppPath));
    }

    let fetchRes: AxiosResponse<any> | undefined;
    const task1: RunnableTask<Void> = {
      name: `Download code from '${url}'`,
      run: async (...args: any): Promise<Result<Void, FxError>> => {
        try {
          sendTelemetryEvent(Component.core, TelemetryEvent.DownloadSampleStart, {
            [TelemetryProperty.SampleAppName]: sample.id,
            module: "fx-core",
          });
          fetchRes = await fetchCodeZip(url);
          if (fetchRes !== undefined) {
            sendTelemetryEvent(Component.core, TelemetryEvent.DownloadSample, {
              [TelemetryProperty.SampleAppName]: sample.id,
              [TelemetryProperty.Success]: TelemetrySuccess.Yes,
              module: "fx-core",
            });
            return ok(Void);
          } else return err(FetchSampleError());
        } catch (e) {
          sendTelemetryErrorEvent(Component.core, TelemetryEvent.DownloadSample, assembleError(e), {
            [TelemetryProperty.SampleAppName]: sample.id,
            module: "fx-core",
          });
          return err(assembleError(e));
        }
      },
    };

    const task2: RunnableTask<Void> = {
      name: "Save and unzip package",
      run: async (...args: any): Promise<Result<Void, FxError>> => {
        if (fetchRes) {
          await saveFilesRecursively(new AdmZip(fetchRes.data), sampleId, folder);
        }
        return ok(Void);
      },
    };
    const task3: RunnableTask<Void> = {
      name: "post process",
      run: async (...args: any): Promise<Result<Void, FxError>> => {
        await downloadSampleHook(sampleId, sampleAppPath);
        return ok(Void);
      },
    };
    const group = new GroupOfTasks<Void>([task1, task2, task3], {
      sequential: true,
      fastFail: true,
    });
    const runRes = await fxcore.tools.ui.runWithProgress(group, {
      showProgress: true,
      cancellable: false,
    });
    if (runRes.isOk()) {
      return ok(sampleAppPath);
    } else {
      return err(runRes.error);
    }
  }
  return err(InvalidInputError(`invalid answer for '${CoreQuestionNames.Samples}'`, inputs));
}

export async function createEnvWithName(
  targetEnvName: string,
  projectSettings: ProjectSettings,
  inputs: Inputs,
  core: FxCore
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
  core.tools.logProvider.debug(
    `[core] persist ${targetEnvName} env profile to path ${writeEnvResult.value}: ${JSON.stringify(
      newEnvConfig
    )}`
  );

  if (isArmSupportEnabled() && isAzureProject(projectSettings.solutionSettings)) {
    const solutionContext: SolutionContext = {
      projectSettings,
      envInfo: newEnvInfo(targetEnvName, newEnvConfig),
      root: inputs.projectPath || "",
      ...core.tools,
      ...core.tools.tokenProvider,
      answers: inputs,
      cryptoProvider: new LocalCrypto(projectSettings.projectId),
      permissionRequestProvider: inputs.projectPath
        ? new PermissionRequestFileProvider(inputs.projectPath)
        : undefined,
    };

    await getParameterJson(solutionContext);
  }

  return ok(Void);
}

export function newProjectSettings() {
  const projectSettings: ProjectSettings = {
    appName: "",
    projectId: uuid.v4(),
    version: "2.0.0",
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
    cryptoProvider: core.tools.cryptoProvider!,
    permissionRequestProvider: core.tools.permissionRequest!,
    projectSetting: projectSettings,
  };
  return context;
}

export * from "./error";
export * from "./tools";
