// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import AdmZip from "adm-zip";
import { v4 } from "uuid";
import * as path from "path";
import isUUID from "validator/lib/isUUID";
import { TeamsAppManifest, Result, FxError, ok, err } from "@microsoft/teamsfx-api";
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { CreateAppPackageArgs } from "./interfaces/CreateAppPackageArgs";
import { manifestUtils } from "../../resource/appManifest/utils/ManifestUtils";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { Constants, DEFAULT_DEVELOPER } from "../../resource/appManifest/constants";
import { TelemetryPropertyKey } from "../../resource/appManifest/utils/telemetry";
import { expandEnvironmentVariable, getEnvironmentVariables } from "../../utils/common";
import { getLocalizedString } from "../../../common/localizeUtils";
import { HelpLinks } from "../../../common/constants";

const actionName = "teamsApp/createAppPackage";

export class CreateAppPackageDriver implements StepDriver {
  public async run(
    args: CreateAppPackageArgs,
    context: DriverContext,
    withEmptyCapabilities?: boolean
  ): Promise<Result<Map<string, string>, FxError>> {
    const state = this.loadCurrentState();
    const manifestRes = await manifestUtils._readAppManifest(args.manifestTemplatePath);
    if (manifestRes.isErr()) {
      return err(manifestRes.error);
    }
    let manifest: TeamsAppManifest = manifestRes.value;
    if (!isUUID(manifest.id)) {
      manifest.id = v4();
    }

    if (withEmptyCapabilities) {
      manifest.bots = [];
      manifest.composeExtensions = [];
      manifest.configurableTabs = [];
      manifest.staticTabs = [];
      manifest.webApplicationInfo = undefined;
    }

    // Adjust template for samples with unnecessary placeholders
    const capabilities = manifestUtils._getCapabilities(manifest);
    if (capabilities.isErr()) {
      return err(capabilities.error);
    }
    const hasFrontend =
      capabilities.value.includes("staticTab") || capabilities.value.includes("configurableTab");
    const tabEndpoint = state.TAB_ENDPOINT;
    if (!tabEndpoint && !hasFrontend) {
      manifest.developer = DEFAULT_DEVELOPER;
    }

    const manifestTemplateString = JSON.stringify(manifest);

    // Add environment variable keys to telemetry
    const customizedKeys = getEnvironmentVariables(manifestTemplateString);
    const telemetryProps: { [key: string]: string } = {};
    telemetryProps[TelemetryPropertyKey.customizedKeys] = JSON.stringify(customizedKeys);

    const resolvedManifestString = expandEnvironmentVariable(manifestTemplateString);

    const isLocalDebug = state.ENV_NAME === "local";
    const tokens = getEnvironmentVariables(resolvedManifestString).filter(
      (x) => x != "TEAMS_APP_ID"
    );
    if (tokens.length > 0) {
      if (isLocalDebug) {
        return err(
          AppStudioResultFactory.UserError(
            AppStudioError.GetLocalDebugConfigFailedError.name,
            AppStudioError.GetLocalDebugConfigFailedError.message(
              new Error(getLocalizedString("plugins.appstudio.dataRequired", tokens.join(",")))
            )
          )
        );
      } else {
        return err(
          AppStudioResultFactory.UserError(
            AppStudioError.GetRemoteConfigFailedError.name,
            AppStudioError.GetRemoteConfigFailedError.message(
              getLocalizedString("plugins.appstudio.dataRequired", tokens.join(",")),
              false
            ),
            HelpLinks.WhyNeedProvision
          )
        );
      }
    }

    manifest = JSON.parse(resolvedManifestString);

    // dynamically set validDomains for manifest, which can be refactored by static manifest templates
    if (isLocalDebug || manifest.validDomains?.length === 0) {
      const validDomains: string[] = [];
      const tabEndpoint = state.TAB_ENDPOINT;
      const tabDomain = state.TAB_DOMAIN;
      const botDomain = state.BOT_DOMAIN;
      if (tabDomain) {
        validDomains.push(tabDomain);
      }
      if (tabEndpoint && isLocalDebug) {
        validDomains.push(tabEndpoint.slice(8));
      }
      if (botDomain) {
        validDomains.push(botDomain);
      }
      for (const domain of validDomains) {
        if (manifest.validDomains?.indexOf(domain) == -1) {
          manifest.validDomains.push(domain);
        }
      }
    }

    // Deal with relative path
    // Environment variables should have been replaced by value
    // ./build/appPackage/appPackage.dev.zip instead of ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip
    let zipFileName = args.outputPath;
    if (!path.isAbsolute(zipFileName)) {
      zipFileName = path.join(context.projectPath, zipFileName);
    }

    const appDirectory = path.dirname(args.manifestTemplatePath);
    const colorFile = path.join(appDirectory, manifest.icons.color);
    if (!(await fs.pathExists(colorFile))) {
      const error = AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(colorFile)
      );
      return err(error);
    }

    const outlineFile = path.join(appDirectory, manifest.icons.outline);
    if (!(await fs.pathExists(outlineFile))) {
      const error = AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(outlineFile)
      );
      return err(error);
    }

    const zip = new AdmZip();
    zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(manifest, null, 4)));

    // outline.png & color.png, relative path
    let dir = path.dirname(manifest.icons.color);
    zip.addLocalFile(colorFile, dir === "." ? "" : dir);
    dir = path.dirname(manifest.icons.outline);
    zip.addLocalFile(outlineFile, dir === "." ? "" : dir);

    zip.writeZip(zipFileName);

    // TODO: should we keep manifest json as well?
    // const manifestFileName = path.join(buildFolderPath, `manifest.${envInfo.envName}.json`);
    // if (await fs.pathExists(manifestFileName)) {
    //     await fs.chmod(manifestFileName, 0o777);
    // }
    // await fs.writeFile(manifestFileName, JSON.stringify(manifest, null, 4));
    // await fs.chmod(manifestFileName, 0o444);

    return ok(new Map([["TEAMS_APP_PACKAGE_PATH", zipFileName]]));
  }

  private loadCurrentState() {
    return {
      TAB_ENDPOINT: process.env.TAB_ENDPOINT,
      TAB_DOMAIN: process.env.TAB_DOMAIN,
      BOT_ID: process.env.BOT_ID,
      BOT_DOMAIN: process.env.BOT_DOMAIN,
      ENV_NAME: process.env.TEAMSFX_ENV,
    };
  }
}
