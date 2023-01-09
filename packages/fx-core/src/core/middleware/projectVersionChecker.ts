// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, Platform } from "@microsoft/teamsfx-api";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { CoreHookContext } from "../types";
import { TOOLS } from "../globalVars";
import { getLocalizedString } from "../../common/localizeUtils";
import semver from "semver";
import { isV3Enabled } from "../../common/tools";
import { getProjectVersion } from "./utils/v3MigrationUtils";
import { VersionInfo, VersionSource } from "../../common/versionMetadata";

let userCancelFlag = false;
const methods: Set<string> = new Set(["getProjectConfig", "checkPermission"]);

export const ProjectVersionCheckerMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  const versionInfo = await getProjectVersion(ctx);
  if ((await needToShowUpdateDialog(ctx, versionInfo)) && checkMethod(ctx)) {
    showDialog(ctx);
  }

  await next();
};

async function needToShowUpdateDialog(ctx: CoreHookContext, versionInfo: VersionInfo) {
  if (versionInfo && versionInfo.source !== VersionSource.projectSettings) {
    return true;
  }
  return false;
}

// TODO: add url for download proper toolkit version
async function showDialog(ctx: CoreHookContext) {
  const lastArg = ctx.arguments[ctx.arguments.length - 1];
  const inputs: Inputs = lastArg === ctx ? ctx.arguments[ctx.arguments.length - 2] : lastArg;
  if (inputs.platform === Platform.VSCode) {
    await TOOLS?.ui.showMessage(
      "warn",
      getLocalizedString("core.projectVersionChecker.vscodeUseNewVersion"),
      false,
      "OK"
    );
  } else if (inputs.platform === Platform.CLI) {
    TOOLS?.logProvider.warning(getLocalizedString("core.projectVersionChecker.cliUseNewVersion"));
  } else if (inputs.platform === Platform.VS) {
    await TOOLS?.ui.showMessage(
      "warn",
      getLocalizedString("core.projectVersionChecker.vscodeUseNewVersion"),
      false,
      "OK"
    );
  }
}

function checkMethod(ctx: CoreHookContext): boolean {
  if (ctx.method && methods.has(ctx.method) && userCancelFlag) return false;
  userCancelFlag = ctx.method != undefined && methods.has(ctx.method);
  return true;
}
