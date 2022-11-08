// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DriverContext } from "./driver/interface/commonArgs";
import { AppDefinition } from "./resource/appManifest/interfaces/appDefinition";
import * as appStudio from "./resource/appManifest/appStudio";
import { err, Result, ok, FxError, UserError } from "@microsoft/teamsfx-api";
import path from "path";
import { manifestUtils } from "./resource/appManifest/utils/ManifestUtils";

const appPackageFolderName = "appPackage";

export async function updateFilesForTdp(ctx: DriverContext, appDefinition: AppDefinition) {}

async function getManifest(
  ctx: DriverContext,
  appDefinition: AppDefinition
): Promise<Result<undefined, FxError>> {
  const res = await appStudio.getAppPackage(
    appDefinition.teamsAppId!,
    ctx.m365TokenProvider,
    ctx.logProvider
  );
  if (res.isErr()) {
    return err(res.error);
  }

  const appPackage = res.value;

  const manifestTemplatePath = await manifestUtils.getTeamsAppManifestPath(ctx.projectPath);
  if (!appPackage.manifest) {
    //should never happen
    return err(new UserError("", "", "", ""));
  }
  const manifest = JSON.parse(appPackage.manifest.toString("utf8"));
  manifest.id = "${{TEAMS_APP_ID}}";

  return ok(undefined);
}
