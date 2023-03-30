// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigFolderName,
  ConfigMap,
  CryptoProvider,
  EnvStateFileNameTemplate,
  EnvConfig,
  err,
  FxError,
  ok,
  StatesFolderName,
  Result,
  SystemError,
  InputConfigsFolderName,
  EnvConfigFileNameTemplate,
  EnvNamePlaceholder,
  EnvInfo,
  Json,
  v3,
  Inputs,
  Platform,
  Void,
  CloudResource,
  InputsWithProjectPath,
  v2,
  UserError,
} from "@microsoft/teamsfx-api";
import path, { basename } from "path";
import fs from "fs-extra";
import * as dotenv from "dotenv";
import {
  dataNeedEncryption,
  replaceTemplateWithUserData,
  serializeDict,
  separateSecretData,
  mapToJson,
  compileHandlebarsTemplateString,
  isV3Enabled,
} from "../common/tools";
import { GLOBAL_CONFIG } from "../component/constants";
import { Component, sendTelemetryErrorEvent, TelemetryEvent } from "../common/telemetry";
import Ajv from "ajv";
import * as draft6MetaSchema from "ajv/dist/refs/json-schema-draft-06.json";
import * as envConfigSchema from "@microsoft/teamsfx-api/build/schemas/envConfig.json";
import { ConstantString, ManifestVariables } from "../common/constants";
import { InvalidEnvConfigError, WriteFileError } from "./error";
import { loadProjectSettings } from "./middleware/projectSettingsLoader";
import { getLocalAppName } from "../component/resource/appManifest/utils/utils";
import { Container } from "typedi";
import { pick } from "lodash";
import { convertEnvStateV2ToV3, convertEnvStateV3ToV2 } from "../component/migrate";
import { LocalCrypto } from "./crypto";
import { envUtil } from "../component/utils/envUtil";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { FileNotFoundError } from "../error/common";

export interface EnvStateFiles {
  envState: string;
  userDataFile: string;
}

export const envPrefix = "$env.";

class EnvironmentManager {
  public readonly envNameRegex = /^[\w\d-_]+$/;
  public readonly envConfigNameRegex = /^config\.(?<envName>[\w\d-_]+)\.json$/i;
  public readonly envStateNameRegex = /^state\.(?<envName>[\w\d-_]+)\.json$/i;

  public readonly schema = "https://aka.ms/teamsfx-env-config-schema";
  public readonly envConfigDescription =
    `You can customize the TeamsFx config for different environments.` +
    ` Visit https://aka.ms/teamsfx-env-config to learn more about this.`;

  private readonly defaultEnvName = "dev";
  private readonly ajv;
  private readonly localEnvName = "local";

  constructor() {
    this.ajv = new Ajv();
    this.ajv.addMetaSchema(draft6MetaSchema);
  }

  public async loadEnvInfo(
    projectPath: string,
    cryptoProvider: CryptoProvider,
    envName?: string,
    v3 = false
  ): Promise<Result<v3.EnvInfoV3, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(new FileNotFoundError("EnvironmentManager", projectPath));
    }
    envName = envName ?? this.getDefaultEnvName();
    const configResult = await this.loadEnvConfig(projectPath, envName);
    if (configResult.isErr()) {
      return err(configResult.error);
    }
    const stateResult = await this.loadEnvState(projectPath, envName, cryptoProvider);
    if (stateResult.isErr()) {
      return err(stateResult.error);
    }
    return ok({
      envName,
      config: configResult.value as Json,
      state: stateResult.value as v3.ResourceStates,
    });
  }

  public newEnvConfigData(appName: string, existingTabEndpoint?: string): EnvConfig {
    const envConfig: EnvConfig = {
      $schema: this.schema,
      description: this.envConfigDescription,
      manifest: {
        appName: {
          short: appName,
          full: `Full name for ${appName}`,
        },
        description: {
          short: `Short description of ${appName}`,
          full: `Full description of ${appName}`,
        },
        icons: {
          color: "resources/color.png",
          outline: "resources/outline.png",
        },
      },
    };

    if (existingTabEndpoint) {
      // Settings to build a static Tab app from existing app.
      envConfig.manifest[ManifestVariables.TabContentUrl] = existingTabEndpoint;
      envConfig.manifest[ManifestVariables.TabWebsiteUrl] = existingTabEndpoint;
    }

    return envConfig;
  }

  public async writeEnvConfig(
    projectPath: string,
    envConfig: EnvConfig,
    envName?: string
  ): Promise<Result<string, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(new FileNotFoundError("EnvironmentManager", projectPath));
    }

    const envConfigsFolder = this.getEnvConfigsFolder(projectPath);
    if (!(await fs.pathExists(envConfigsFolder))) {
      await fs.ensureDir(envConfigsFolder);
    }

    envName = envName ?? this.getDefaultEnvName();
    const envConfigPath = this.getEnvConfigPath(envName, projectPath);

    try {
      await fs.writeFile(envConfigPath, JSON.stringify(envConfig, null, 4));
    } catch (error) {
      return err(WriteFileError(error));
    }

    return ok(envConfigPath);
  }

  public async writeEnvState(
    envData: Map<string, any> | Json,
    projectPath: string,
    cryptoProvider: CryptoProvider,
    envName?: string,
    isV3?: boolean
  ): Promise<Result<string, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(new FileNotFoundError("EnvironmentManager", projectPath));
    }

    const envStatesFolder = this.getEnvStatesFolder(projectPath);
    if (!(await fs.pathExists(envStatesFolder))) {
      await fs.ensureDir(envStatesFolder);
    }

    envName = envName ?? this.getDefaultEnvName();
    const envFiles = this.getEnvStateFilesPath(envName, projectPath);

    let envState: Json = envData instanceof Map ? mapToJson(envData) : envData;
    // v3 envState will be converted into v2 for compatibility
    envState = convertEnvStateV3ToV2(envState);
    const secrets = separateSecretData(envState);
    this.encrypt(secrets, cryptoProvider);

    try {
      if (!this.isEmptyRecord(envState)) {
        await fs.writeFile(envFiles.envState, JSON.stringify(envState, null, 4));
      }

      if (!this.isEmptyRecord(secrets)) {
        await fs.writeFile(envFiles.userDataFile, serializeDict(secrets));
      }
    } catch (error) {
      return err(WriteFileError(error));
    }

    return ok(envFiles.envState);
  }

  public async listAllEnvConfigs(projectPath: string): Promise<Result<Array<string>, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(new FileNotFoundError("EnvironmentManager", projectPath));
    }

    if (isV3Enabled()) {
      const allEnvsRes = await envUtil.listEnv(projectPath);
      if (allEnvsRes.isErr()) return err(allEnvsRes.error);
      return ok(allEnvsRes.value);
    }

    const envConfigsFolder = this.getEnvConfigsFolder(projectPath);
    if (!(await fs.pathExists(envConfigsFolder))) {
      return ok([]);
    }

    const configFiles = await fs.readdir(envConfigsFolder);
    const envNames = configFiles
      .map((file) => this.getEnvNameFromPath(file))
      .filter((name): name is string => name !== null);

    return ok(envNames);
  }

  public async listRemoteEnvConfigs(
    projectPath: string,
    returnErrorIfEmpty = false
  ): Promise<Result<Array<string>, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(new FileNotFoundError("EnvironmentManager", projectPath));
    }

    if (isV3Enabled()) {
      const allEnvsRes = await envUtil.listEnv(projectPath);
      if (allEnvsRes.isErr()) return err(allEnvsRes.error);
      const remoteEnvs = allEnvsRes.value.filter((env) => env !== this.getLocalEnvName());
      if (remoteEnvs.length === 0 && returnErrorIfEmpty)
        return err(
          new UserError({
            source: "EnvironmentManager",
            name: "NoEnvFilesError",
            displayMessage: getLocalizedString("core.error.NoEnvFilesError"),
            message: getDefaultString("core.error.NoEnvFilesError"),
          })
        );
      return ok(remoteEnvs);
    }

    const envConfigsFolder = this.getEnvConfigsFolder(projectPath);
    const configFiles = !(await fs.pathExists(envConfigsFolder))
      ? []
      : await fs.readdir(envConfigsFolder);
    const envNames = configFiles
      .map((file) => this.getEnvNameFromPath(file))
      .filter((name): name is string => name !== null && name !== this.getLocalEnvName());
    if (envNames.length === 0 && returnErrorIfEmpty)
      return err(
        new UserError({
          source: "EnvironmentManager",
          name: "NoEnvFilesError",
          displayMessage: getLocalizedString("core.error.NoEnvFilesError"),
          message: getDefaultString("core.error.NoEnvFilesError"),
        })
      );
    return ok(envNames);
  }

  public async checkEnvExist(projectPath: string, env: string): Promise<Result<boolean, FxError>> {
    const envList = await environmentManager.listAllEnvConfigs(projectPath);
    if (envList.isErr()) {
      return err(envList.error);
    }
    if (envList.value?.indexOf(env) >= 0) {
      return ok(true);
    } else {
      return ok(false);
    }
  }

  public isEnvConfig(projectPath: string, filePath: string): boolean {
    const fileName = path.basename(filePath);
    const fileDirname = path.dirname(filePath);
    const configFolder = this.getEnvConfigsFolder(projectPath);
    const relativeFilePath = path.relative(configFolder, fileDirname);

    if (relativeFilePath !== "") {
      return false;
    }

    const match = fileName.match(environmentManager.envConfigNameRegex);
    return match !== null;
  }

  public getDotEnvPath(envName: string, projectPath: string): string {
    return path.join(projectPath, "env", `.env.${envName}`);
  }

  public getEnvConfigPath(envName: string, projectPath: string): string {
    const basePath = this.getEnvConfigsFolder(projectPath);
    return path.resolve(basePath, EnvConfigFileNameTemplate.replace(EnvNamePlaceholder, envName));
  }

  public getEnvStateFilesPath(envName: string, projectPath: string): EnvStateFiles {
    const basePath = this.getEnvStatesFolder(projectPath);
    const envState = path.resolve(
      basePath,
      EnvStateFileNameTemplate.replace(EnvNamePlaceholder, envName)
    );
    const userDataFile = path.resolve(basePath, `${envName}.userdata`);

    return { envState: envState, userDataFile };
  }

  public async createLocalEnv(
    projectPath: string,
    projectAppName?: string
  ): Promise<Result<Void, FxError>> {
    const inputs: Inputs = {
      projectPath: projectPath,
      platform: Platform.VSCode,
    };
    const projectSettings = await loadProjectSettings(inputs, true);
    if (projectSettings.isOk()) {
      const appName = getLocalAppName(projectAppName ?? projectSettings.value.appName!);
      const newEnvConfig = environmentManager.newEnvConfigData(appName);
      const res = await environmentManager.writeEnvConfig(
        inputs.projectPath!,
        newEnvConfig,
        environmentManager.getLocalEnvName()
      );
      if (res.isErr()) {
        return res;
      }
    } else {
      return projectSettings;
    }
    return ok(Void);
  }

  private async loadEnvConfig(
    projectPath: string,
    envName: string
  ): Promise<Result<EnvConfig, FxError>> {
    const envConfigPath = this.getEnvConfigPath(envName, projectPath);
    if (!(await fs.pathExists(envConfigPath))) {
      if (envName === this.getLocalEnvName()) {
        await this.createLocalEnv(projectPath);
      }
      if (!(await fs.pathExists(envConfigPath))) {
        return err(new FileNotFoundError("EnvironmentManager", envConfigPath));
      }
    }

    const validate = this.ajv.compile<EnvConfig>(envConfigSchema);
    let data;
    try {
      data = await fs.readFile(envConfigPath, ConstantString.UTF8Encoding);

      // resolve environment variables
      data = this.expandEnvironmentVariables(data);
      data = JSON.parse(data);
    } catch (error) {
      return err(InvalidEnvConfigError(envName, `Failed to read env config JSON: ${error}`));
    }

    if (validate(data)) {
      return ok(data);
    }

    return err(InvalidEnvConfigError(envName, JSON.stringify(validate.errors)));
  }

  private async loadEnvState(
    projectPath: string,
    envName: string,
    cryptoProvider: CryptoProvider
  ): Promise<Result<Map<string, any> | v3.ResourceStates, FxError>> {
    const envFiles = this.getEnvStateFilesPath(envName, projectPath);
    const userDataResult = await this.loadUserData(envFiles.userDataFile, cryptoProvider);
    if (userDataResult.isErr()) {
      return err(userDataResult.error);
    }
    const userData = userDataResult.value;
    if (!(await fs.pathExists(envFiles.envState))) {
      return ok({ solution: {} });
    }
    const template = await fs.readFile(envFiles.envState, { encoding: "utf-8" });
    const result = replaceTemplateWithUserData(template, userData);
    let resultJson: Json = JSON.parse(result);
    resultJson = convertEnvStateV2ToV3(resultJson);
    return ok(resultJson as v3.ResourceStates);
  }

  private expandEnvironmentVariables(templateContent: string): string {
    if (!templateContent) {
      return templateContent;
    }

    return compileHandlebarsTemplateString(templateContent, { $env: process.env });
  }

  private getEnvNameFromPath(filePath: string): string | null {
    const match = this.envConfigNameRegex.exec(filePath);
    if (match != null && match.groups != null) {
      return match.groups.envName;
    }

    return null;
  }

  private getConfigFolder(projectPath: string): string {
    return path.resolve(projectPath, `.${ConfigFolderName}`);
  }

  private getStatesFolder(projectPath: string): string {
    return path.resolve(this.getConfigFolder(projectPath), StatesFolderName);
  }

  private getEnvStatesFolder(projectPath: string): string {
    return this.getStatesFolder(projectPath);
  }

  public getEnvConfigsFolder(projectPath: string): string {
    return path.resolve(this.getConfigFolder(projectPath), InputConfigsFolderName);
  }

  private async loadUserData(
    userDataPath: string,
    cryptoProvider: CryptoProvider
  ): Promise<Result<Record<string, string>, FxError>> {
    if (!(await fs.pathExists(userDataPath))) {
      return ok({});
    }

    const content = await fs.readFile(userDataPath, "UTF-8");
    const secrets = dotenv.parse(content);

    const res = this.decrypt(secrets, cryptoProvider);
    if (res.isErr()) {
      const fxError: SystemError = res.error;
      const fileName = basename(userDataPath);
      fxError.message = `Project update failed because of ${fxError.name}(file:${fileName}):${fxError.message}, if your local file '*.userdata' is not modified, please report to us by click 'Report Issue' button.`;
      fxError.userData = `file: ${fileName}\n------------FILE START--------\n${content}\n------------FILE END----------`;
      sendTelemetryErrorEvent(Component.core, TelemetryEvent.DecryptUserdata, fxError);
    }
    return res;
  }

  private encrypt(
    secrets: Record<string, string>,
    cryptoProvider: CryptoProvider
  ): Result<Record<string, string>, FxError> {
    for (const secretKey of Object.keys(secrets)) {
      if (!dataNeedEncryption(secretKey)) {
        continue;
      }
      if (!secrets[secretKey]) {
        delete secrets[secretKey];
        continue;
      }
      const encryptedSecret = cryptoProvider.encrypt(secrets[secretKey]);
      // always success
      if (encryptedSecret.isOk()) {
        secrets[secretKey] = encryptedSecret.value;
      }
    }

    return ok(secrets);
  }

  private decrypt(
    secrets: Record<string, string>,
    cryptoProvider: CryptoProvider
  ): Result<Record<string, string>, FxError> {
    for (const secretKey of Object.keys(secrets)) {
      if (!dataNeedEncryption(secretKey)) {
        continue;
      }

      const secretValue = secrets[secretKey];
      const plaintext = cryptoProvider.decrypt(secretValue);
      if (plaintext.isErr()) {
        return err(plaintext.error);
      }

      secrets[secretKey] = plaintext.value;
    }

    return ok(secrets);
  }

  private isEmptyRecord(data: Record<any, any>): boolean {
    return Object.keys(data).length === 0;
  }

  public getDefaultEnvName() {
    return this.defaultEnvName;
  }

  public getLocalEnvName() {
    return this.localEnvName;
  }

  public async resetProvisionState(inputs: InputsWithProjectPath, ctx: v2.Context): Promise<void> {
    const allEnvRes = await environmentManager.listRemoteEnvConfigs(inputs.projectPath!);
    if (allEnvRes.isOk()) {
      for (const env of allEnvRes.value) {
        const loadEnvRes = await this.loadEnvInfo(
          inputs.projectPath,
          new LocalCrypto(ctx.projectSetting.projectId),
          env,
          true
        );
        if (loadEnvRes.isOk()) {
          const envInfo = loadEnvRes.value as v3.EnvInfoV3;
          if (
            envInfo.state?.solution?.provisionSucceeded === true ||
            envInfo.state?.solution?.provisionSucceeded === "true"
          ) {
            envInfo.state.solution.provisionSucceeded = false;
            await environmentManager.writeEnvState(
              envInfo.state,
              inputs.projectPath,
              ctx.cryptoProvider,
              env,
              true
            );
          }
        }
      }
    }
  }
}

export function separateSecretDataV3(envState: any): Record<string, string> {
  const res: Record<string, string> = {};
  for (const resourceName of Object.keys(envState)) {
    if (resourceName === "solution") continue;
    const component = Container.get<CloudResource>(resourceName);
    const state = envState[resourceName] as Json;
    if (component.secretKeys && component.secretKeys.length > 0) {
      component.secretKeys.forEach((secretKey: string) => {
        const keyName = component.outputs[secretKey].key;
        const fullKeyName = `${resourceName}.${keyName}`;
        res[keyName] = state[keyName];
        state[secretKey] = `{{${fullKeyName}}}`;
      });
    }
    const outputKeys = component.finalOutputKeys.map((k) => component.outputs[k].key);
    envState[resourceName] = pick(state, outputKeys);
  }
  return res;
}

export const environmentManager = new EnvironmentManager();

export function newEnvInfo(
  envName?: string,
  config?: EnvConfig,
  state?: Map<string, any>
): EnvInfo {
  return {
    envName: envName ?? environmentManager.getDefaultEnvName(),
    config: config ?? {
      manifest: {
        appName: {
          short: "teamsfx_app",
        },
        description: {
          short: `Short description of teamsfx_app`,
          full: `Full description of teamsfx_app`,
        },
        icons: {
          color: "resources/color.png",
          outline: "resources/outline.png",
        },
      },
    },
    state: state ?? new Map<string, any>([[GLOBAL_CONFIG, new ConfigMap()]]),
  };
}

export function newEnvInfoV3(
  envName?: string,
  config?: EnvConfig,
  state?: v3.ResourceStates
): v3.EnvInfoV3 {
  return {
    envName: envName ?? environmentManager.getDefaultEnvName(),
    config: config ?? {
      manifest: {
        appName: {
          short: "teamsfx_app",
        },
        description: {
          short: `Short description of teamsfx_app`,
          full: `Full description of teamsfx_app`,
        },
        icons: {
          color: "resources/color.png",
          outline: "resources/outline.png",
        },
      },
    },
    state: state ?? { solution: {} },
  };
}
