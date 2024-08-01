// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as deepDiff from "deep-diff";
import { Service } from "typedi";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import * as path from "path";
import { SyncManifestArgs } from "./interfaces/SyncManifest";
import {
  Colors,
  FxError,
  Platform,
  Result,
  TeamsAppManifest,
  UserError,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import * as appStudio from "./appStudio";
import { WrapDriverContext } from "../util/wrapUtil";
import { AppStudioResultFactory } from "./results";
import { AppStudioError } from "./errors";
import { getLocalizedString } from "../../../common/localizeUtils";
import { envUtil } from "../../utils/envUtil";
import { pathUtils } from "../../utils/pathUtils";
import { metadataUtil } from "../../utils/metadataUtil";
import { teamsDevPortalClient } from "../../../client/teamsDevPortalClient";
import { AppStudioScopes, getAppStudioEndpoint } from "../../../common/constants";
import { manifestUtils } from "./utils/ManifestUtils";

const actionName = "teamsApp/syncManifest";

@Service(actionName)
export class SyncManifestDriver implements StepDriver {
  description?: string | undefined;
  progressTitle?: string | undefined;
  public async execute(args: SyncManifestArgs, context: DriverContext): Promise<ExecutionResult> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    const res = await this.sync(args, wrapContext);
    return {
      result: res,
      summaries: wrapContext.summaries,
    };
  }

  public async sync(
    args: SyncManifestArgs,
    context: WrapDriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    if (!args.projectPath || !args.env) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.SyncManifestFailedError.name,
          AppStudioError.SyncManifestFailedError.message([
            getLocalizedString("error.appstudio.syncManifestInvalidInput"),
          ])
        )
      );
    }
    let teamsAppId = args.teamsAppId;
    let manifestTemplatePath = "";
    if (!args.teamsAppId) {
      const res = await this.getTeamsAppIdAndManifestTemplatePath(args.projectPath, args.env);
      if (res.isErr()) {
        return err(res.error);
      }
      teamsAppId = res.value.get("teamsAppId");
      manifestTemplatePath = res.value.get("manifestTemplatePath") ?? "";
    }
    const appPackageRes = await appStudio.getAppPackage(
      teamsAppId ?? "",
      context.m365TokenProvider,
      context.logProvider
    );
    if (appPackageRes.isErr()) {
      return err(appPackageRes.error);
    }
    const appPackage = appPackageRes.value;
    if (!appPackage.manifest) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.SyncManifestFailedError.name,
          AppStudioError.SyncManifestFailedError.message([
            getLocalizedString("error.appstudio.syncManifestNoManifest"),
          ])
        )
      );
    }
    const currentManifestRes = await manifestUtils._readAppManifest(manifestTemplatePath);
    if (currentManifestRes.isErr()) {
      return err(currentManifestRes.error);
    }
    const currentManifest = currentManifestRes.value as any;
    const newManifest = JSON.parse(appPackage.manifest.toString("utf8"));
    const differences = deepDiff.diff(currentManifest, newManifest);
    console.log(differences);
    return ok(new Map<string, string>());
  }

  // Returns the teams app id and manifest template path.
  // Map key: "teamsAppId", "manifestTemplatePath".
  private async getTeamsAppIdAndManifestTemplatePath(
    projectPath: string,
    env: string
  ): Promise<Result<Map<string, string>, FxError>> {
    const envRes = await envUtil.readEnv(projectPath, env);
    if (envRes.isErr()) {
      return err(envRes.error);
    }
    const teamsappYamlPath = pathUtils.getYmlFilePath(projectPath, env);
    const yamlProjectModel = await metadataUtil.parse(teamsappYamlPath, env);
    if (yamlProjectModel.isErr()) {
      return err(yamlProjectModel.error);
    }
    const projectModel = yamlProjectModel.value;
    let teamsAppId = "";
    let yamlManifestPath = "";
    for (const action of projectModel.provision?.driverDefs ?? []) {
      if (action.uses === "teamsApp/create") {
        const teamsAppIdKeyName = action.writeToEnvironmentFile?.teamsAppId || "TEAMS_APP_ID";
        teamsAppId = envRes.value[teamsAppIdKeyName];
      }
      if (action.uses === "teamsApp/zipAppPackage") {
        const parameters = action.with as { [key: string]: string };
        yamlManifestPath = parameters["manifestPath"];
      }
    }
    if (!teamsAppId) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.SyncManifestFailedError.name,
          AppStudioError.SyncManifestFailedError.message([
            getLocalizedString("error.appstudio.syncManifestNoTeamsAppId"),
          ])
        )
      );
    }
    const deafultManifestTemplatePath = path.join(projectPath, "appPackage", "manifest.json");
    let manifestTemplatePath = "";
    if (!yamlManifestPath) {
      manifestTemplatePath = deafultManifestTemplatePath;
    } else if (path.isAbsolute(yamlManifestPath)) {
      manifestTemplatePath = yamlManifestPath;
    } else {
      manifestTemplatePath = path.join(projectPath, yamlManifestPath);
    }
    return ok(
      new Map([
        ["teamsAppId", teamsAppId],
        ["manifestTemplatePath", manifestTemplatePath],
      ])
    );
  }

  async getManifestTemplatePath(
    projectPath: string,
    env?: string
  ): Promise<Result<string, FxError>> {
    const deafultManifestTemplatePath = path.join(projectPath, "appPackage", "manifest.json");
    const teamsappYamlPath = pathUtils.getYmlFilePath(projectPath, env);
    const yamlProjectModel = await metadataUtil.parse(teamsappYamlPath, env);
    if (yamlProjectModel.isErr()) {
      return err(yamlProjectModel.error);
    }
    const projectModel = yamlProjectModel.value;
    let manifestTemplatePath = "";
    for (const action of projectModel.provision?.driverDefs ?? []) {
      if (action.uses === "teamsApp/zipAppPackage") {
        const parameters = action.with as { [key: string]: string };
        manifestTemplatePath = parameters["manifestPath"];
      }
    }
    if (!manifestTemplatePath) {
      return ok(deafultManifestTemplatePath);
    }
    if (path.isAbsolute(manifestTemplatePath)) {
      return ok(manifestTemplatePath);
    }
    return ok(path.join(projectPath, manifestTemplatePath));
  }
}
