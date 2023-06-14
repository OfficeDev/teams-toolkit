// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigFolderName,
  EnvConfig,
  EnvConfigFileNameTemplate,
  EnvNamePlaceholder,
  EnvStateFileNameTemplate,
  FxError,
  InputConfigsFolderName,
  Inputs,
  Platform,
  Result,
  StatesFolderName,
  Void,
  err,
  ok,
  v3,
} from "@microsoft/teamsfx-api";
import * as envConfigSchema from "@microsoft/teamsfx-api/build/schemas/envConfig.json";
import Ajv from "ajv";
import * as draft6MetaSchema from "ajv/dist/refs/json-schema-draft-06.json";
import fs from "fs-extra";
import path from "path";
import { ConstantString, ManifestVariables } from "../common/constants";
import { compileHandlebarsTemplateString } from "../common/tools";
import { getLocalAppName } from "../component/resource/appManifest/utils/utils";
import { envUtil } from "../component/utils/envUtil";
import { FileNotFoundError, NoEnvFilesError, WriteFileError } from "../error/common";
import { InvalidEnvConfigError } from "./error";
import { loadProjectSettings } from "./middleware/projectSettingsLoader";

interface EnvStateFiles {
  envState: string;
  userDataFile: string;
}
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
      return err(new WriteFileError(error as Error, "EnvironmentManager"));
    }

    return ok(envConfigPath);
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

  public async listAllEnvConfigs(projectPath: string): Promise<Result<Array<string>, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(new FileNotFoundError("EnvironmentManager", projectPath));
    }
    const allEnvsRes = await envUtil.listEnv(projectPath);
    if (allEnvsRes.isErr()) return err(allEnvsRes.error);
    return ok(allEnvsRes.value);
  }

  public async listRemoteEnvConfigs(
    projectPath: string,
    returnErrorIfEmpty = false
  ): Promise<Result<Array<string>, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(new FileNotFoundError("EnvironmentManager", projectPath));
    }
    const allEnvsRes = await envUtil.listEnv(projectPath);
    if (allEnvsRes.isErr()) return err(allEnvsRes.error);
    const remoteEnvs = allEnvsRes.value.filter((env) => env !== this.getLocalEnvName());
    if (remoteEnvs.length === 0 && returnErrorIfEmpty)
      return err(new NoEnvFilesError("EnvironmentManager"));
    return ok(remoteEnvs);
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

  private expandEnvironmentVariables(templateContent: string): string {
    if (!templateContent) {
      return templateContent;
    }

    return compileHandlebarsTemplateString(templateContent, { $env: process.env });
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

  public getDefaultEnvName() {
    return this.defaultEnvName;
  }

  public getLocalEnvName() {
    return this.localEnvName;
  }
}

export const environmentManager = new EnvironmentManager();

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
