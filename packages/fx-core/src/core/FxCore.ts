// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks";
import {
  BuildFolderName,
  ConfigFolderName,
  CoreCallbackEvent,
  CoreCallbackFunc,
  CryptoProvider,
  err,
  Func,
  FunctionRouter,
  FxError,
  InputConfigsFolderName,
  Inputs,
  InputsWithProjectPath,
  ok,
  Platform,
  ProjectSettings,
  QTreeNode,
  Result,
  Stage,
  StatesFolderName,
  Tools,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { DotenvParseOutput } from "dotenv";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Container } from "typedi";
import * as uuid from "uuid";
import { localSettingsFileName } from "../common/localSettingsProvider";
import { TelemetryReporterInstance } from "../common/telemetry";
import { ILifecycle, LifecycleName } from "../component/configManager/interface";
import { YamlParser } from "../component/configManager/parser";
import { ComponentNames, validateSchemaOption } from "../component/constants";
import "../component/driver/index";
import { DriverContext } from "../component/driver/interface/commonArgs";
import "../component/driver/script/scriptDriver";
import { EnvLoaderMW } from "../component/middleware/envMW";
import { QuestionMW } from "../component/middleware/questionMW";
import { getQuestionsForValidateMethod } from "../component/question";
import { AppManifest } from "../component/resource/appManifest/appManifest";
import { createContextV3 } from "../component/utils";
import { envUtil } from "../component/utils/envUtil";
import { settingsUtil } from "../component/utils/settingsUtil";
import { CallbackRegistry } from "./callback";
import { checkPermission, grantPermission, listCollaborator } from "./collaborator";
import { LocalCrypto } from "./crypto";
import { environmentManager, newEnvInfoV3 } from "./environment";
import { CopyFileError, InvalidInputError, ObjectIsUndefinedError, WriteFileError } from "./error";
import { FxCoreV3Implement } from "./FxCoreImplementV3";
import { setCurrentStage, setTools, TOOLS } from "./globalVars";
import { ErrorHandlerMW } from "./middleware/errorHandler";
import { getQuestionsForCreateProjectV2 } from "./middleware/questionModel";
import { CoreQuestionNames } from "./question";
import { CoreHookContext, PreProvisionResForVS, VersionCheckRes } from "./types";

export class FxCore implements v3.ICore {
  tools: Tools;
  isFromSample?: boolean;
  settingsVersion?: string;
  v3Implement: FxCoreV3Implement;

  constructor(tools: Tools) {
    this.tools = tools;
    setTools(tools);
    TelemetryReporterInstance.telemetryReporter = tools.telemetryReporter;
    this.v3Implement = new FxCoreV3Implement(tools);
  }

  /**
   * @todo this's a really primitive implement. Maybe could use Subscription Model to
   * refactor later.
   */
  public on(event: CoreCallbackEvent, callback: CoreCallbackFunc): void {
    return CallbackRegistry.set(event, callback);
  }

  /**
   * lifecycle command: create new project
   */
  async createProject(inputs: Inputs): Promise<Result<string, FxError>> {
    return this.v3Implement.dispatch(this.createProject, inputs);
  }

  /**
   * lifecycle commands: provision
   */
  async provisionResources(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.provisionResources, inputs);
  }

  /**
   * Only used to provision Teams app with user provided app package in CLI
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
    const appStudioV3 = Container.get<AppManifest>(ComponentNames.AppManifest);
    return appStudioV3.provisionForCLI(
      context,
      inputs as v2.InputsWithProjectPath,
      newEnvInfoV3(),
      TOOLS.tokenProvider
    );
  }

  /**
   * lifecycle commands: deploy
   */
  async deployArtifacts(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.deployArtifacts, inputs);
  }

  async localDebug(inputs: Inputs): Promise<Result<Void, FxError>> {
    inputs.env = environmentManager.getLocalEnvName();
    return this.provisionResources(inputs);
  }

  /**
   * none lifecycle command, v3 only
   */
  async deployAadManifest(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.deployAadManifest, inputs);
  }

  /**
   * none lifecycle command, v3 only
   */
  async addWebpart(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.addWebpart, inputs);
  }

  /**
   * lifecycle command: publish
   */
  async publishApplication(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.publishApplication, inputs);
  }

  /**
   * most commands will be deprecated in V3
   */
  async executeUserTask(
    func: Func,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<any, FxError>> {
    return await this.v3Implement.dispatchUserTask(this.executeUserTask, func, inputs);
  }

  /**
   * v3 only none lifecycle command
   */
  async buildAadManifest(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.buildAadManifest, inputs);
  }

  /**
   * v3 only none lifecycle command
   */
  async deployTeamsManifest(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.deployTeamsManifest, inputs);
  }

  /**
   * v3 only none lifecycle command
   */
  @hooks([QuestionMW(getQuestionsForValidateMethod)])
  async validateApplication(inputs: Inputs): Promise<Result<Void, FxError>> {
    if (inputs[CoreQuestionNames.ValidateMethod] === validateSchemaOption.id) {
      return await this.validateManifest(inputs);
    } else {
      return await this.validateAppPackage(inputs);
    }
  }
  /**
   * v3 only none lifecycle command
   */
  async validateManifest(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.validateManifest, inputs);
  }
  /**
   * v3 only none lifecycle command
   */
  async validateAppPackage(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.validateAppPackage, inputs);
  }
  /**
   * v3 only none lifecycle command
   */
  async createAppPackage(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.createAppPackage, inputs);
  }

  /**
   * get url to preview the app, may prompt to select env, hub and Teams manifest
   * v3 only none lifecycle command
   * @param {Inputs} inputs
   * @returns the url to preview the app
   */
  async previewWithManifest(inputs: Inputs): Promise<Result<string, FxError>> {
    return this.v3Implement.dispatch(this.previewWithManifest, inputs);
  }

  /**
   * Warning: this API only works for CLI_HELP, it has no business with interactive run for CLI!
   */
  @hooks([ErrorHandlerMW])
  async getQuestions(
    stage: Stage,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    inputs.stage = Stage.getQuestions;
    setCurrentStage(Stage.getQuestions);
    if (stage === Stage.create) {
      return await getQuestionsForCreateProjectV2(inputs);
    }
    return ok(undefined);
  }

  /**
   * @deprecated for V3
   */
  @hooks([ErrorHandlerMW])
  async getQuestionsForUserTask(
    func: FunctionRouter,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return ok(undefined);
  }

  /**
   * @deprecated
   */
  async getDotEnv(
    inputs: InputsWithProjectPath
  ): Promise<Result<DotenvParseOutput | undefined, FxError>> {
    return this.v3Implement.dispatch(this.getDotEnv, inputs);
  }

  /**
   * get all dot envs
   */
  async getDotEnvs(
    inputs: InputsWithProjectPath
  ): Promise<Result<{ [name: string]: DotenvParseOutput }, FxError>> {
    return this.v3Implement.dispatch(this.getDotEnvs, inputs);
  }

  /**
   * @deprecated in V3
   */
  async getProjectConfig(inputs: Inputs): Promise<Result<any | undefined, FxError>> {
    return ok({
      settings: {},
      config: {},
    });
  }

  /**
   * @deprecated in V3
   */
  async getProjectConfigV3(inputs: Inputs): Promise<Result<any | undefined, FxError>> {
    return ok({});
  }

  async grantPermission(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.grantPermission, inputs);
  }

  /**
   * none lifecycle command
   */
  async checkPermission(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.checkPermission, inputs);
  }

  /**
   * none lifecycle command
   */
  async listCollaborator(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.listCollaborator, inputs);
  }

  @hooks([ErrorHandlerMW, EnvLoaderMW(false)])
  async getSelectedEnv(inputs: Inputs): Promise<Result<string | undefined, FxError>> {
    return ok(inputs.env); //work for both v2 and v3
  }

  async createLocalCrypto(projectPath: string): Promise<Result<CryptoProvider, FxError>> {
    const settingsRes = await settingsUtil.readSettings(projectPath);
    if (settingsRes.isErr()) {
      return err(settingsRes.error);
    }
    const projectId = settingsRes.value.trackingId;
    const cryptoProvider = new LocalCrypto(projectId);
    return ok(cryptoProvider);
  }

  /**
   * only for vs code extension
   */
  @hooks([ErrorHandlerMW])
  async encrypt(plaintext: string, inputs: Inputs): Promise<Result<string, FxError>> {
    const res = await this.createLocalCrypto(inputs.projectPath!);
    if (res.isErr()) {
      return err(res.error);
    }
    return res.value.encrypt(plaintext);
  }
  /**
   * only for vs code extension
   */
  @hooks([ErrorHandlerMW])
  async decrypt(ciphertext: string, inputs: Inputs): Promise<Result<string, FxError>> {
    const res = await this.createLocalCrypto(inputs.projectPath!);
    if (res.isErr()) {
      return err(res.error);
    }
    return res.value.decrypt(ciphertext);
  }

  async createEnv(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.createEnv, inputs);
  }

  // a phantom migration method for V3
  async phantomMigrationV3(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.phantomMigrationV3, inputs);
  }

  // a project version check
  async projectVersionCheck(inputs: Inputs): Promise<Result<VersionCheckRes, FxError>> {
    return this.v3Implement.dispatch(this.projectVersionCheck, inputs);
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

  async activateEnv(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  // apply the given yaml template to current project.
  async apply(
    inputs: Inputs,
    templatePath: string,
    lifecycleName: string
  ): Promise<Result<Void, FxError>> {
    if (!inputs.projectPath) {
      return err(InvalidInputError("invalid projectPath", inputs));
    }
    const projectPath = inputs.projectPath;
    if (!inputs.env) {
      return err(InvalidInputError("invalid env", inputs));
    }
    const env = inputs.env;
    const lifecycleName_: LifecycleName = lifecycleName as LifecycleName;
    const result = await envUtil.readEnv(projectPath, env);
    if (result.isErr()) {
      return err(result.error);
    }

    const parser = new YamlParser();
    const maybeProjectModel = await parser.parse(templatePath);
    if (maybeProjectModel.isErr()) {
      return err(maybeProjectModel.error);
    }

    const projectModel = maybeProjectModel.value;
    const driverContext: DriverContext = {
      azureAccountProvider: TOOLS.tokenProvider.azureAccountProvider!,
      m365TokenProvider: TOOLS.tokenProvider.m365TokenProvider!,
      ui: TOOLS.ui,
      progressBar: undefined,
      logProvider: TOOLS.logProvider,
      telemetryReporter: TOOLS.telemetryReporter!,
      projectPath: projectPath,
      platform: inputs.platform,
    };
    const lifecycle = projectModel[lifecycleName_];
    if (lifecycle) {
      return this.runLifecycle(lifecycle, driverContext, env);
    } else {
      await driverContext.logProvider.warning(`No definition found for ${lifecycleName}`);
      return ok(Void);
    }
  }

  async runLifecycle(
    lifecycle: ILifecycle,
    driverContext: DriverContext,
    env: string
  ): Promise<Result<Void, FxError>> {
    const r = await lifecycle.execute(driverContext);
    const runResult = r.result;
    if (runResult.isOk()) {
      await driverContext.logProvider.info(`Lifecycle ${lifecycle.name} succeeded`);
      const writeResult = await envUtil.writeEnv(
        driverContext.projectPath,
        env,
        envUtil.map2object(runResult.value)
      );
      return writeResult.map(() => Void);
    } else {
      const error = runResult.error;
      if (error.kind === "Failure") {
        await driverContext.logProvider.error(
          `Failed to run ${lifecycle.name} due to ${error.error.name}: ${error.error.message}`
        );
        return err(error.error);
      } else {
        try {
          const failedDriver = error.reason.failedDriver;
          if (error.reason.kind === "UnresolvedPlaceholders") {
            const unresolved = error.reason.unresolvedPlaceHolders;
            await driverContext.logProvider.warning(
              `Unresolved placeholders: ${unresolved.join(",")} for driver ${failedDriver.uses}`
            );
            return ok(Void);
          } else {
            await driverContext.logProvider.error(
              `Failed to run ${lifecycle.name} due to ${error.reason.error.name}: ${error.reason.error.message}. Failed driver: ${failedDriver.uses}`
            );
            return err(error.reason.error);
          }
        } finally {
          await envUtil.writeEnv(driverContext.projectPath, env, envUtil.map2object(error.env));
        }
      }
    }
  }

  async preProvisionForVS(inputs: Inputs): Promise<Result<PreProvisionResForVS, FxError>> {
    return this.v3Implement.dispatch(this.preProvisionForVS, inputs);
  }

  async publishInDeveloperPortal(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.publishInDeveloperPortal, inputs);
  }
}

export async function ensureBasicFolderStructure(
  inputs: Inputs,
  createPackageJson = true
): Promise<Result<null, FxError>> {
  if (!inputs.projectPath) {
    return err(new ObjectIsUndefinedError("projectPath"));
  }
  try {
    if (createPackageJson) {
      const appName = inputs[CoreQuestionNames.AppName] as string;
      if (inputs.platform !== Platform.VS) {
        const packageJsonFilePath = path.join(inputs.projectPath, `package.json`);
        const exists = await fs.pathExists(packageJsonFilePath);
        if (!exists) {
          await fs.writeFile(
            packageJsonFilePath,
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
                  "@microsoft/teamsfx-cli": "1.*",
                },
                license: "MIT",
              },
              null,
              4
            )
          );
        }
      }
    }
    {
      const gitIgnoreFilePath = path.join(inputs.projectPath, `.gitignore`);
      let lines: string[] = [];
      const exists = await fs.pathExists(gitIgnoreFilePath);
      if (exists) {
        const content = await fs.readFile(gitIgnoreFilePath, { encoding: "utf8" });
        lines = content.split("\n");
        for (let i = 0; i < lines.length; ++i) {
          lines[i] = lines[i].trim();
        }
      }
      const gitIgnoreContent = [
        "\n# TeamsFx files",
        "node_modules",
        `.${ConfigFolderName}/${InputConfigsFolderName}/${localSettingsFileName}`,
        `.${ConfigFolderName}/${StatesFolderName}/*.userdata`,
        ".DS_Store",
        ".env.teamsfx.local",
        "subscriptionInfo.json",
        BuildFolderName,
      ];
      gitIgnoreContent.push(`.${ConfigFolderName}/${InputConfigsFolderName}/config.local.json`);
      gitIgnoreContent.push(`.${ConfigFolderName}/${StatesFolderName}/state.local.json`);
      if (inputs.platform === Platform.VS) {
        gitIgnoreContent.push("appsettings.Development.json");
      }
      gitIgnoreContent.forEach((line) => {
        if (!lines.includes(line.trim())) {
          lines.push(line.trim());
        }
      });
      await fs.writeFile(gitIgnoreFilePath, lines.join("\n"), { encoding: "utf8" });
    }
  } catch (e) {
    return err(WriteFileError(e));
  }
  return ok(null);
}

export async function listCollaboratorFunc(inputs: Inputs): Promise<Result<any, FxError>> {
  setCurrentStage(Stage.listCollaborator);
  inputs.stage = Stage.listCollaborator;
  const projectPath = inputs.projectPath;
  if (!projectPath) {
    return err(new ObjectIsUndefinedError("projectPath"));
  }
  const context = createContextV3();
  const res = await listCollaborator(
    context,
    inputs as v2.InputsWithProjectPath,
    undefined,
    TOOLS.tokenProvider
  );
  return res;
}

export async function checkPermissionFunc(
  inputs: Inputs,
  ctx?: CoreHookContext
): Promise<Result<any, FxError>> {
  setCurrentStage(Stage.checkPermission);
  inputs.stage = Stage.checkPermission;
  const projectPath = inputs.projectPath;
  if (!projectPath) {
    return err(new ObjectIsUndefinedError("projectPath"));
  }
  const context = createContextV3();
  const res = await checkPermission(
    context,
    inputs as v2.InputsWithProjectPath,
    undefined,
    TOOLS.tokenProvider
  );
  return res;
}

export async function grantPermissionFunc(
  inputs: Inputs,
  ctx?: CoreHookContext
): Promise<Result<any, FxError>> {
  setCurrentStage(Stage.grantPermission);
  inputs.stage = Stage.grantPermission;
  const projectPath = inputs.projectPath;
  if (!projectPath) {
    return err(new ObjectIsUndefinedError("projectPath"));
  }
  const context = createContextV3();
  const res = await grantPermission(
    context,
    inputs as v2.InputsWithProjectPath,
    undefined,
    TOOLS.tokenProvider
  );
  return res;
}
