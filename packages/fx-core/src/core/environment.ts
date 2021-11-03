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
  ProjectSettingsFileName,
} from "@microsoft/teamsfx-api";
import path, { basename } from "path";
import fs from "fs-extra";
import jsum from "jsum";
import * as dotenv from "dotenv";
import {
  dataNeedEncryption,
  replaceTemplateWithUserData,
  PathNotExistError,
  serializeDict,
  separateSecretData,
  WriteFileError,
  mapToJson,
  objectToMap,
  ProjectEnvNotExistError,
  InvalidEnvConfigError,
  ModifiedSecretError,
} from "..";
import { GLOBAL_CONFIG } from "../plugins/solution/fx-solution/constants";
import { Component, sendTelemetryErrorEvent, TelemetryEvent } from "../common/telemetry";
import { compileHandlebarsTemplateString, isMultiEnvEnabled } from "../common";
import Ajv from "ajv";
import * as draft6MetaSchema from "ajv/dist/refs/json-schema-draft-06.json";
import * as envConfigSchema from "@microsoft/teamsfx-api/build/schemas/envConfig.json";
import { ConstantString } from "../common/constants";

export interface EnvStateFiles {
  envState: string;
  userDataFile: string;
}

export const envPrefix = "$env:";

class EnvironmentManager {
  public readonly envNameRegex = /^[\w\d-_]+$/;
  public readonly envConfigNameRegex = /^config\.(?<envName>[\w\d-_]+)\.json$/i;
  public readonly envStateNameRegex = /^state\.(?<envName>[\w\d-_]+)\.json$/i;

  private readonly defaultEnvName = "default";
  private readonly defaultEnvNameNew = "dev";
  private readonly ajv;
  private readonly checksumKey = "_checksum";
  private readonly schema = "https://aka.ms/teamsfx-env-config-schema";
  private readonly envConfigDescription =
    `You can customize the TeamsFx config for different environments.` +
    ` Visit https://aka.ms/teamsfx-env-config to learn more about this.`;

  constructor() {
    this.ajv = new Ajv();
    this.ajv.addMetaSchema(draft6MetaSchema);
  }

  public async loadEnvInfo(
    projectPath: string,
    cryptoProvider: CryptoProvider,
    envName?: string
  ): Promise<Result<EnvInfo, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(PathNotExistError(projectPath));
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

    return ok({ envName, config: configResult.value, state: stateResult.value });
  }

  public newEnvConfigData(appName: string): EnvConfig {
    const envConfig: EnvConfig = {
      $schema: this.schema,
      description: this.envConfigDescription,
      manifest: {
        appName: {
          short: appName,
          full: `Full name for ${appName}`,
        },
      },
    };

    return envConfig;
  }

  public async writeEnvConfig(
    projectPath: string,
    envConfig: EnvConfig,
    envName?: string
  ): Promise<Result<string, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(PathNotExistError(projectPath));
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
    envName?: string
  ): Promise<Result<string, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(PathNotExistError(projectPath));
    }

    const envStatesFolder = this.getEnvStatesFolder(projectPath);
    if (!(await fs.pathExists(envStatesFolder))) {
      await fs.ensureDir(envStatesFolder);
    }

    envName = envName ?? this.getDefaultEnvName();
    const envFiles = this.getEnvStateFilesPath(envName, projectPath);

    const data = envData instanceof Map ? mapToJson(envData) : envData;
    const secrets = separateSecretData(data);
    this.encrypt(secrets, cryptoProvider);
    if (Object.keys(secrets).length) {
      secrets[this.checksumKey] = jsum.digest(secrets, "SHA256", "hex");
    }

    try {
      await fs.writeFile(envFiles.envState, JSON.stringify(data, null, 4));
      await fs.writeFile(envFiles.userDataFile, serializeDict(secrets));
    } catch (error) {
      return err(WriteFileError(error));
    }

    return ok(envFiles.envState);
  }

  public async listEnvConfigs(projectPath: string): Promise<Result<Array<string>, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(PathNotExistError(projectPath));
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

  public async checkEnvExist(projectPath: string, env: string): Promise<Result<boolean, FxError>> {
    const envList = await environmentManager.listEnvConfigs(projectPath);
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

  public getEnvConfigPath(envName: string, projectPath: string): string {
    const basePath = this.getEnvConfigsFolder(projectPath);
    return path.resolve(basePath, EnvConfigFileNameTemplate.replace(EnvNamePlaceholder, envName));
  }

  public getEnvStateFilesPath(envName: string, projectPath: string): EnvStateFiles {
    const basePath = this.getEnvStatesFolder(projectPath);
    const envState = path.resolve(
      basePath,
      isMultiEnvEnabled()
        ? EnvStateFileNameTemplate.replace(EnvNamePlaceholder, envName)
        : `env.${envName}.json`
    );
    const userDataFile = path.resolve(basePath, `${envName}.userdata`);

    return { envState: envState, userDataFile };
  }

  private async loadEnvConfig(
    projectPath: string,
    envName: string
  ): Promise<Result<EnvConfig, FxError>> {
    if (!isMultiEnvEnabled()) {
      return ok({
        manifest: { appName: { short: "" } },
      });
    }

    const envConfigPath = this.getEnvConfigPath(envName, projectPath);
    if (!(await fs.pathExists(envConfigPath))) {
      return err(ProjectEnvNotExistError(envName));
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
  ): Promise<Result<Map<string, any>, FxError>> {
    const envFiles = this.getEnvStateFilesPath(envName, projectPath);
    const userDataResult = await this.loadUserData(envFiles.userDataFile, cryptoProvider);
    if (userDataResult.isErr()) {
      return err(userDataResult.error);
    }
    const userData = userDataResult.value;

    if (!(await fs.pathExists(envFiles.envState))) {
      const data = new Map<string, any>([[GLOBAL_CONFIG, new ConfigMap()]]);

      return ok(data);
    }

    const template = await fs.readFile(envFiles.envState, { encoding: "utf-8" });

    const result = replaceTemplateWithUserData(template, userData);

    const resultJson: Json = JSON.parse(result);

    const data = objectToMap(resultJson);

    return ok(data);
  }

  private expandEnvironmentVariables(templateContent: string): string {
    if (!templateContent) {
      return templateContent;
    }

    const envVars: Record<string, any> = {};
    Object.entries(process.env).forEach(([key, value]) => {
      envVars[envPrefix + key] = value;
    });

    return compileHandlebarsTemplateString(templateContent, envVars);
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
    return isMultiEnvEnabled()
      ? this.getStatesFolder(projectPath)
      : this.getConfigFolder(projectPath);
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
      if (!this.checksumMatch(secrets)) {
        sendTelemetryErrorEvent(
          Component.core,
          TelemetryEvent.DecryptUserdata,
          ModifiedSecretError()
        );
      } else {
        const fxError: SystemError = res.error;
        const fileName = basename(userDataPath);
        fxError.message = `Project update failed because of ${fxError.name}(file:${fileName}):${fxError.message}, if your local file '*.userdata' is not modified, please report to us by click 'Report Issue' button.`;
        fxError.userData = `file: ${fileName}\n------------FILE START--------\n${content}\n------------FILE END----------`;
        sendTelemetryErrorEvent(Component.core, TelemetryEvent.DecryptUserdata, fxError);
      }
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

  private checksumMatch(secrets: Record<string, string>): boolean {
    const checksum = secrets[this.checksumKey];
    if (checksum) {
      delete secrets[this.checksumKey];
      return jsum.digest(secrets, "SHA256", "hex") === checksum;
    }
    return true;
  }

  public getDefaultEnvName() {
    if (isMultiEnvEnabled()) {
      return this.defaultEnvNameNew;
    } else {
      return this.defaultEnvName;
    }
  }
}

export const environmentManager = new EnvironmentManager();
