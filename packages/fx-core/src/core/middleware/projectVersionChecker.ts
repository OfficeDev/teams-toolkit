// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { err, FxError, Inputs, Platform } from "@microsoft/teamsfx-api";
import semver from "semver";
import { getLocalizedString } from "../../common/localizeUtils";
import { MetadataV2, VersionInfo, VersionSource } from "../../common/versionMetadata";
import { IncompatibleProjectError } from "../error";
import { TOOLS } from "../globalVars";
import { CoreHookContext } from "../types";
import { learnMoreLink, moreInfoButton } from "./projectMigratorV3";
import { getProjectVersion } from "./utils/v3MigrationUtils";

let userCancelFlag = false;
const methods: Set<string> = new Set(["getProjectConfig", "checkPermission"]);

export const ProjectVersionCheckerMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  const versionInfo = await getProjectVersion(ctx);
  if ((await needToShowUpdateDialog(ctx, versionInfo)) && checkMethod(ctx)) {
    const errRes = await showDialog(ctx);
    ctx.result = err(errRes);
    return;
  }

  await next();
};

async function needToShowUpdateDialog(ctx: CoreHookContext, versionInfo: VersionInfo) {
  if (versionInfo.source === VersionSource.teamsapp && semver.gte(versionInfo.version, "2.0.0")) {
    return true;
  }
  return false;
}

async function showDialog(ctx: CoreHookContext): Promise<FxError> {
  const lastArg = ctx.arguments[ctx.arguments.length - 1];
  const inputs: Inputs = lastArg === ctx ? ctx.arguments[ctx.arguments.length - 2] : lastArg;
  if (inputs.platform === Platform.VSCode) {
    const messageKey = "core.projectVersionChecker.incompatibleProject";
    const message = getLocalizedString(messageKey);
    TOOLS.ui.showMessage("warn", message, false, moreInfoButton).then((res) => {
      if (res.isOk() && res.value === moreInfoButton) {
        TOOLS.ui.openUrl(MetadataV2.updateToolkitLink);
      }
    });
    return IncompatibleProjectError(messageKey);
  } else if (inputs.platform === Platform.CLI) {
    const messageKey = "core.projectVersionChecker.cliUseNewVersion";
    TOOLS.logProvider.warning(getLocalizedString(messageKey));
    return IncompatibleProjectError(messageKey);
  } else {
    const messageKey = "core.projectVersionChecker.vs.incompatibleProject";
    const message = getLocalizedString(messageKey);
    TOOLS.ui.showMessage("warn", message, false, moreInfoButton).then((res) => {
      if (res.isOk() && res.value === moreInfoButton) {
        TOOLS.ui.openUrl(learnMoreLink);
      }
    });
    return IncompatibleProjectError(messageKey);
  }
}

function checkMethod(ctx: CoreHookContext): boolean {
  if (ctx.method && methods.has(ctx.method) && userCancelFlag) return false;
  userCancelFlag = ctx.method != undefined && methods.has(ctx.method);
  return true;
}
