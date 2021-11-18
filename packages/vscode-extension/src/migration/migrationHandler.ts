// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  err,
  returnUserError,
  returnSystemError,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import vsCodeLogProvider from "../commonlib/log";
import jscodeshift = require("jscodeshift");
import transform from "./migrationTool/replaceSDK";
import transformTs from "./migrationTool/ts/replaceTsSDK";
import { ExtensionSource } from "../error";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import * as constants from "./constants";
import * as StringResources from "../resources/Strings.json";
import * as util from "util";
const PackageJson = require("@npmcli/package-json");

export class TeamsAppMigrationHandler {
  private static readonly excludeFolders = new Set<string>(["node_modules", ".git"]);

  private readonly sourcePath: string;

  constructor(sourcePath: string) {
    this.sourcePath = sourcePath;
  }

  // Return boolean indicating whether package.json is updated or not.
  public async updatePackageJson(): Promise<Result<boolean, FxError>> {
    try {
      // update package.json
      if (!(await fs.pathExists(path.join(this.sourcePath, "package.json")))) {
        return ok(false);
      }
      let needUpdate = false;
      const pkgJson = await PackageJson.load(this.sourcePath);
      const dependencies = pkgJson.content.dependencies;
      if (dependencies && dependencies[constants.teamsClientSDKName]) {
        dependencies[constants.teamsClientSDKName] = constants.teamsClientSDKVersion;
        needUpdate = true;
      }
      const devDependencies = pkgJson.content.devDependencies;
      if (devDependencies && devDependencies[constants.teamsClientSDKName]) {
        devDependencies[constants.teamsClientSDKName] = constants.teamsClientSDKVersion;
        needUpdate = true;
      }

      if (needUpdate) {
        pkgJson.update({
          dependencies: dependencies,
          devDependencies: devDependencies,
        });

        await pkgJson.save();
      } else {
        return ok(false);
      }
    } catch (e: any) {
      return err(returnSystemError(e, ExtensionSource, "UpdatePackageJsonError"));
    }

    return ok(true);
  }

  public async updateCodes(): Promise<Result<null, FxError>> {
    try {
      return await updateCodes(this.sourcePath, TeamsAppMigrationHandler.excludeFolders);
    } catch (e: any) {
      return err(returnSystemError(e, ExtensionSource, "UpdateCodesError"));
    }
  }

  public async updateManifest(): Promise<Result<null, FxError>> {
    try {
      const manifest = await fs.readJSON(this.sourcePath);
      manifest["$schema"] = constants.teamsManifestSchema;
      manifest["manifestVersion"] = constants.teamsManifestVersion;

      // TODO: migrate Teams App Resource-specific consent
      if (!!manifest?.webApplicationInfo?.applicationPermissions) {
        manifest.webApplicationInfo.applicationPermissions = undefined;
      }
      await fs.writeJSON(this.sourcePath, manifest, { spaces: 4, EOL: os.EOL });
      return ok(null);
    } catch (e: any) {
      return err(returnUserError(e, ExtensionSource, "UpdateManifestError"));
    }
  }
}

async function updateCodes(
  dirPath: string,
  excludeFolders?: Set<string>
): Promise<Result<null, FxError>> {
  const failedFiles: string[] = [];
  const names = await fs.readdir(dirPath);
  for (const name of names) {
    const filePath = path.join(dirPath, name);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      if (!excludeFolders?.has(name)) {
        await updateCodes(filePath, excludeFolders);
      }
    } else if (stat.isFile()) {
      const extname = path.extname(filePath);
      if (constants.tsExtNames.includes(extname)) {
        vsCodeLogProvider.info(
          util.format(StringResources.vsc.migrateTeamsTabApp.updateCode, "typescript", filePath)
        );
        const result = await updateCodeInplace(filePath, "ts");
        if (result.isErr()) {
          failedFiles.push(filePath);
        }
      } else if (constants.jsExtNames.includes(extname)) {
        vsCodeLogProvider.info(
          util.format(StringResources.vsc.migrateTeamsTabApp.updateCode, "javascript", filePath)
        );
        const result = await updateCodeInplace(filePath, "js");
        if (result.isErr()) {
          failedFiles.push(filePath);
        }
      } else if (constants.htmlExtNames.includes(extname)) {
        // TODO
      }
    }
  }

  if (failedFiles.length > 0) {
    return err(
      returnUserError(
        new Error(`Failed to migrate files: ${JSON.stringify(failedFiles)}`),
        ExtensionSource,
        "UpdateCodesError"
      )
    );
  }
  return ok(null);
}

async function updateCodeInplace(
  filePath: string,
  type: "ts" | "js"
): Promise<Result<null, FxError>> {
  try {
    const sourceCode = (await fs.readFile(filePath)).toString();
    const fileInfo: jscodeshift.FileInfo = {
      path: filePath,
      source: sourceCode,
    };

    const api: jscodeshift.API = {
      j: jscodeshift,
      jscodeshift: type === "ts" ? jscodeshift.withParser("tsx") : jscodeshift,
      stats: () => {},
      report: () => {},
    };
    const transfromedCode =
      type === "ts" ? transformTs(fileInfo, api, {}) : transform(fileInfo, api, {});
    if (typeof transfromedCode === "string") {
      await fs.writeFile(filePath, transfromedCode);
    }
    return ok(null);
  } catch (error: any) {
    const message = `Failed to migrate file ${filePath}. Detail: ${error?.message ?? "None"}.`;
    vsCodeLogProvider.warning(message);
    const fxError = returnUserError(new Error(message), ExtensionSource, "UpdateCodeError");
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.MigrateTeamsTabAppCode, fxError);
    return err(fxError);
  }
}
