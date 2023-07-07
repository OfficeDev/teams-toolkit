// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks";
import {
  CoreCallbackEvent,
  CryptoProvider,
  err,
  Func,
  FxError,
  Inputs,
  InputsWithProjectPath,
  ok,
  QTreeNode,
  Result,
  Stage,
  Tools,
  Void,
} from "@microsoft/teamsfx-api";
import { DotenvParseOutput } from "dotenv";
import * as path from "path";
import "reflect-metadata";
import { TelemetryReporterInstance } from "../common/telemetry";
import { ILifecycle, LifecycleName } from "../component/configManager/interface";
import { YamlParser } from "../component/configManager/parser";
import { validateSchemaOption } from "../component/constants";
import "../component/driver/index";
import { DriverContext } from "../component/driver/interface/commonArgs";
import "../component/driver/script/scriptDriver";
import { EnvLoaderMW } from "../component/middleware/envMW";
import { QuestionMW } from "../component/middleware/questionMW";
import { envUtil } from "../component/utils/envUtil";
import { metadataUtil } from "../component/utils/metadataUtil";
import { pathUtils } from "../component/utils/pathUtils";
import { settingsUtil } from "../component/utils/settingsUtil";
import { createProjectCliHelpNode } from "../question/create";
import { CallbackRegistry } from "./callback";
import { LocalCrypto } from "./crypto";
import { environmentManager } from "./environment";
import { InvalidInputError } from "./error";
import { FxCoreV3Implement } from "./FxCoreImplementV3";
import { setTools, TOOLS } from "./globalVars";
import { ErrorHandlerMW } from "./middleware/errorHandler";
import { PreProvisionResForVS, VersionCheckRes } from "./types";
import { QuestionNames } from "../question/questionNames";
import { questions } from "../question";

export type CoreCallbackFunc = (name: string, err?: FxError, data?: any) => void;

export class FxCore {
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
  async executeUserTask(func: Func, inputs: Inputs): Promise<Result<any, FxError>> {
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
  @hooks([QuestionMW(questions.selectTeamsAppValidationMethod)])
  async validateApplication(inputs: Inputs): Promise<Result<Void, FxError>> {
    if (inputs[QuestionNames.ValidateMethod] === validateSchemaOption.id) {
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
    if (stage === Stage.create) {
      return ok(createProjectCliHelpNode() as QTreeNode);
    }
    return ok(undefined);
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
   * given projectPath and filePath, return whether the filePath is a env file
   */
  async isEnvFile(projectPath: string, inputFile: string): Promise<Result<boolean, FxError>> {
    const inputFileName = path.basename(inputFile);
    const envName = envUtil.extractEnvNameFromFileName(inputFileName);
    if (!envName) return ok(false);
    const folderRes = await pathUtils.getEnvFolderPath(projectPath);
    if (folderRes.isErr()) return err(folderRes.error);
    const envFolderPath = folderRes.value;
    if (!envFolderPath) return ok(false);
    const inputFileDir = path.dirname(inputFile);
    if (path.resolve(inputFileDir) !== path.resolve(envFolderPath)) return ok(false);
    return ok(true);
  }

  /**
   * get projectId
   */
  async getProjectId(projectPath: string): Promise<Result<string, FxError>> {
    const ymlPath = pathUtils.getYmlFilePath(projectPath, "dev");
    const maybeProjectModel = await metadataUtil.parse(ymlPath, "dev");
    if (maybeProjectModel.isErr()) {
      return err(maybeProjectModel.error);
    }
    const projectModel = maybeProjectModel.value as any;
    return ok(projectModel.projectId || "");
  }

  /**
   * get Teams App Name from yml
   */
  async getTeamsAppName(projectPath: string): Promise<Result<string, FxError>> {
    const ymlPath = pathUtils.getYmlFilePath(projectPath, "dev");
    const maybeProjectModel = await metadataUtil.parse(ymlPath, "dev");
    if (maybeProjectModel.isErr()) {
      return err(maybeProjectModel.error);
    }
    const projectModel = maybeProjectModel.value as any;
    if (projectModel.provision) {
      const teamsAppCreate = projectModel.provision?.driverDefs.find(
        (d: any) => d.uses === "teamsApp/create"
      );
      if (teamsAppCreate) {
        const name = (teamsAppCreate.with as any).name;
        if (name) {
          return ok(name.replace("-${{TEAMSFX_ENV}}", "") || "");
        }
      }
    }
    return ok("");
  }

  /**
   * get project info
   */
  async getProjectInfo(
    projectPath: string,
    env: string
  ): Promise<
    Result<
      {
        projectId: string;
        teamsAppId: string;
        teamsAppName: string;
        m365TenantId: string;
      },
      FxError
    >
  > {
    const ymlPath = pathUtils.getYmlFilePath(projectPath, env);
    const maybeProjectModel = await metadataUtil.parse(ymlPath, env);
    if (maybeProjectModel.isErr()) {
      return err(maybeProjectModel.error);
    }
    const projectModel = maybeProjectModel.value;
    const readEnvRes = await envUtil.readEnv(projectPath, env, false, true);
    if (readEnvRes.isErr()) {
      return err(readEnvRes.error);
    }
    const envObject = readEnvRes.value;
    const res: {
      projectId: string;
      teamsAppId: string;
      teamsAppName: string;
      m365TenantId: string;
    } = {
      projectId: (projectModel as any).projectId || "",
      teamsAppId: "",
      teamsAppName: "",
      m365TenantId: envObject.TEAMS_APP_TENANT_ID || "",
    };
    if (projectModel.provision) {
      const teamsAppCreate = projectModel.provision.driverDefs.find(
        (d) => d.uses === "teamsApp/create"
      );
      if (teamsAppCreate) {
        const teamsAppIdEnvName = teamsAppCreate.writeToEnvironmentFile?.teamsAppId;
        if (teamsAppIdEnvName) {
          const teamsAppId = envObject[teamsAppIdEnvName];
          res.teamsAppId = teamsAppId;
        }
        const name = (teamsAppCreate.with as any).name;
        if (name) {
          res.teamsAppName = name.replace("-${{TEAMSFX_ENV}}", "") || "";
        }
      }
    }
    return ok(res);
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

  async preCheckYmlAndEnvForVS(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.preCheckYmlAndEnvForVS, inputs);
  }

  async publishInDeveloperPortal(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.v3Implement.dispatch(this.publishInDeveloperPortal, inputs);
  }
}
