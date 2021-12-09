import { hooks } from "@feathersjs/hooks/lib";
import {
  AppPackageFolderName,
  ConfigFolderName,
  Core,
  CoreCallbackEvent,
  CoreCallbackFunc,
  err,
  Func,
  FunctionRouter,
  FxError,
  Inputs,
  NotImplementedError,
  ok,
  Platform,
  ProjectConfig,
  ProjectSettings,
  QTreeNode,
  Result,
  Stage,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import {
  CoreHookContext,
  createBasicFolderStructure,
  downloadSample,
  getProjectSettingsVersion,
  getRootDirectory,
  globalStateUpdate,
  InvalidInputError,
  ObjectIsUndefinedError,
  ProjectFolderExistError,
} from "../..";
import {
  ContextInjectorMW,
  EnvInfoWriterMW,
  ErrorHandlerMW,
  ProjectSettingsWriterMW,
  QuestionModelMW,
} from "../middleware";
import { SupportV1ConditionMW } from "../middleware/supportV1ConditionHandler";
import {
  CoreQuestionNames,
  ProjectNamePattern,
  QuestionAppName,
  QuestionRootFolder,
  ScratchOptionNo,
} from "../question";
import { FxCoreV3 } from "./core";
import AdmZip from "adm-zip";
import * as fs from "fs-extra";
import * as jsonschema from "jsonschema";
import * as path from "path";
import * as uuid from "uuid";
/**
 * Since FxCoreV3 has change the semantics for each atomic commands, FxCoreAdapter is an adapter to make sure that FxCoreAdapter's APIs have the same semantics as FxCore
 */
export class FxCoreAdapter implements Core {
  core = new FxCoreV3();

  public on(event: CoreCallbackEvent, callback: CoreCallbackFunc): void {}

  @hooks([
    ErrorHandlerMW,
    SupportV1ConditionMW(true),
    QuestionModelMW,
    ContextInjectorMW,
    // ProjectSettingsWriterMW,
    // EnvInfoWriterMW(true),
  ])
  async createProject(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<string, FxError>> {
    if (!ctx) {
      return err(new ObjectIsUndefinedError("ctx for createProject"));
    }
    inputs.stage = Stage.create;
    let folder = inputs[QuestionRootFolder.name] as string;
    if (inputs.platform === Platform.VSCode) {
      folder = getRootDirectory();
      await fs.ensureDir(folder);
    }
    const scratch = inputs[CoreQuestionNames.CreateFromScratch] as string;
    let projectPath: string;
    let globalStateDescription = "openReadme";
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
        solutionSettings: {
          name: "",
          version: "1.0.0",
        },
        version: getProjectSettingsVersion(),
        isFromSample: false,
      };
      ctx.projectSettings = projectSettings;

      inputs.projectPath = projectPath;
      const initRes = await this.core.init(inputs as v2.InputsWithProjectPath);
      if (initRes.isErr()) return err(initRes.error);
    }

    if (inputs.platform === Platform.VSCode) {
      await globalStateUpdate(globalStateDescription, true);
    }
    return ok(projectPath);
  }

  async migrateV1Project(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<string, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "migrateV1Project"));
  }

  async provisionResources(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "provisionResources"));
  }

  async deployArtifacts(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "provisionResources"));
  }

  async localDebug(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "provisionResources"));
  }

  async publishApplication(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "provisionResources"));
  }

  async executeUserTask(
    func: Func,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<unknown, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "executeUserTask"));
  }

  async getQuestions(
    stage: Stage,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "executeUserTask"));
  }

  async getQuestionsForUserTask(
    func: FunctionRouter,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "getQuestionsForUserTask"));
  }

  async getProjectConfig(
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<ProjectConfig | undefined, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "getProjectConfig"));
  }

  async grantPermission(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "grantPermission"));
  }

  async checkPermission(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "checkPermission"));
  }

  async listCollaborator(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "listCollaborator"));
  }

  async listAllCollaborators(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "listAllCollaborators"));
  }

  async getSelectedEnv(
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<string | undefined, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "getSelectedEnv"));
  }

  async encrypt(
    plaintext: string,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<string, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "encrypt"));
  }

  async decrypt(
    ciphertext: string,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<string, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "decrypt"));
  }

  async buildArtifacts(inputs: Inputs): Promise<Result<Void, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "buildArtifacts"));
  }

  async createEnv(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "buildArtifacts"));
  }

  async activateEnv(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    return err(new NotImplementedError("FxCoreAdapter", "buildArtifacts"));
  }
}
