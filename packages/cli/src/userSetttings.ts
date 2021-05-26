// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import os from "os";
import fs from "fs-extra";
import { ConfigFolderName, FxError, err, ok, Result } from "@microsoft/teamsfx-api";
import path from "path";
import { ReadFileError, ConfigNotFoundError, WriteFileError } from "./error";

const UserSettingsFileName = "cliProfile.json";

export enum CliConfigOptions {
  Telemetry = "telemetry"
}

export enum CliConfigTelemetry {
  On = "on",
  Off = "off"
}

export class UserSettings {
  public static getUserSettingsFile(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, `.${ConfigFolderName}`, UserSettingsFileName);
  }

  public static getConfigSync(): Result<any, FxError> {
    const filePath = this.getUserSettingsFile();
    if (!fs.existsSync(filePath)) {
      try {
        fs.writeJSONSync(filePath, {});
      } catch (e) {
        return err(WriteFileError(e));
      }
    }

    try {
      const config = fs.readJSONSync(this.getUserSettingsFile());
      return ok(config);
    } catch (e) {
      return err(ReadFileError(e));
    }
  }

  public static setConfigSync(option: {[key: string]: string}): Result<null, FxError> {
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
    if (config[CliConfigOptions.Telemetry] && config[CliConfigOptions.Telemetry] === CliConfigTelemetry.Off) {
      return ok(false);
    }

    return ok(true);
  }
}