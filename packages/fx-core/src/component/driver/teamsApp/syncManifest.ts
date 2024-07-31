// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Service } from "typedi";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { SyncManifestArgs } from "./interfaces/SyncManifest";
import {
  Colors,
  FxError,
  ManifestUtil,
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
    if (!args.teamsAppId) {
      const teamsAppIdRes = await this.loadTeamsAppId(args.projectPath, args.env);
      if (teamsAppIdRes.isErr()) {
        return err(teamsAppIdRes.error);
      }
      teamsAppId = teamsAppIdRes.value;
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
    const manifest = JSON.parse(appPackage.manifest.toString("utf8"));
    const manifestTemplatePath = path.join(args.projectPath, "appPackage/manifest.json");

    return ok(new Map<string, string>());
  }

  private async loadTeamsAppId(projectPath: string, env: string): Promise<Result<string, FxError>> {
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
    for (const action of projectModel.provision?.driverDefs ?? []) {
      if (action.uses === "teamsApp/create") {
        const teamsAppIdKeyName = action.writeToEnvironmentFile?.teamsAppId || "TEAMS_APP_ID";
        teamsAppId = envRes.value[teamsAppIdKeyName];
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
    return ok(teamsAppId);
  }
}
