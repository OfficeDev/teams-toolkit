// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import os from "os";
import fs from "fs-extra";
import path from "path";

import { ConfigFolderName, FxError, err, ok, Result } from "@microsoft/teamsfx-api";

import { ReadFileError, WriteFileError } from "./error";

const UserSettingsFileName = "cliProfile.json";

export enum CliConfigOptions {
  Telemetry = "telemetry",
  EnvCheckerValidateDotnetSdk = "validate-dotnet-sdk",
  EnvCheckerValidateFuncCoreTools = "validate-func-core-tools",
  EnvCheckerValidateNode = "validate-node",
  EnvCheckerValidateNgrok = "validate-ngrok",
  TrustDevCert = "trust-development-certificate",
  RunFrom = "run-from",
  Interactive = "interactive",
  AutomaticNpmInstall = "automatic-npm-install",
}

export enum CliConfigTelemetry {
  On = "on",
  Off = "off",
}

export enum CliConfigEnvChecker {
  On = "on",
  Off = "off",
}

export enum CliConfigRunFrom {
  GitHub = "GitHub",
  AzDo = "AzDo",
  Jenkins = "Jenkins",
  Other = "Other",
}

export enum CliConfigAutomaticNpmInstall {
  On = "on",
  Off = "off",
}

export class UserSettings {
  public static getUserSettingsFile(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, `.${ConfigFolderName}`, UserSettingsFileName);
  }

  public static getConfigSync(): Result<any, FxError> {
    const filePath = this.getUserSettingsFile();

    try {
      if (!fs.pathExistsSync(path.dirname(filePath))) {
        fs.mkdirpSync(path.dirname(filePath));
      }

      if (!fs.existsSync(filePath)) {
        fs.writeJSONSync(filePath, {});
      }
    } catch (e) {
      return err(WriteFileError(e));
    }

    try {
      const config = fs.readJSONSync(filePath);
      return ok(config);
    } catch (e) {
      return err(ReadFileError(e));
    }
  }

  public static setConfigSync(option: { [key: string]: string }): Result<null, FxError> {
    const result = this.getConfigSync();
    if (result.isErr()) {
      return err(result.error);
    }

    const config = result.value;
    const obj = Object.assign(config, option);

    try {
      fs.writeJSONSync(this.getUserSettingsFile(), obj);
      return ok(null);
    } catch (e) {
      return err(WriteFileError(e));
    }
  }

  public static getTelemetrySetting(): Result<boolean, FxError> {
    const result = this.getConfigSync();
    if (result.isErr()) {
      return err(result.error);
    }

    const config = result.value;
    if (
      config[CliConfigOptions.Telemetry] &&
      config[CliConfigOptions.Telemetry] === CliConfigTelemetry.Off
    ) {
      return ok(false);
    }

    return ok(true);
  }

  public static getInteractiveSetting(): Result<boolean, FxError> {
    const result = this.getConfigSync();
    if (result.isErr()) {
      return err(result.error);
    }

    const config = result.value;
    if (config[CliConfigOptions.Interactive] && config[CliConfigOptions.Interactive] === "false") {
      return ok(false);
    }

    return ok(true);
  }
}
