// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, Inputs, Platform } from "@microsoft/teamsfx-api";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { CoreHookContext } from "../types";
import { TOOLS } from "../globalVars";
import { getLocalizedString } from "../../common/localizeUtils";
import semver from "semver";
import { isV3Enabled } from "../../common/tools";
import { getProjectVersion } from "./utils/v3MigrationUtils";
import { MetadataV2, VersionInfo, VersionSource } from "../../common/versionMetadata";
import { learnMoreText } from "./projectMigrator";
import { learnMoreLink } from "./projectMigratorV3";
import {
  sendTelemetryEvent,
  Component,
  TelemetryEvent,
  TelemetryProperty,
} from "../../common/telemetry";
import { IncompatibleProjectError } from "../error";

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
  if (isV3Enabled()) {
    if (versionInfo.source === VersionSource.teamsapp && semver.gte(versionInfo.version, "2.0.0")) {
      return true;
    }
  } else {
    if (versionInfo.source !== VersionSource.projectSettings) {
      sendTelemetryEvent(Component.core, TelemetryEvent.DisplayToolingUpdateNotification, {
        [TelemetryProperty.ToolkitVersion]: "V2",
      });
      return true;
    }
  }
  return false;
}

async function showDialog(ctx: CoreHookContext): Promise<FxError> {
  const lastArg = ctx.arguments[ctx.arguments.length - 1];
  const inputs: Inputs = lastArg === ctx ? ctx.arguments[ctx.arguments.length - 2] : lastArg;
  if (inputs.platform === Platform.VSCode) {
    const messageKey = "core.projectVersionChecker.incompatibleProject";
    const message = getLocalizedString(messageKey);
    TOOLS.ui.showMessage("warn", message, false, learnMoreText).then((res) => {
      if (res.isOk() && res.value === learnMoreText) {
        TOOLS.ui.openUrl(MetadataV2.updateToolkitLink);
      }
    });
    return IncompatibleProjectError(messageKey);
  } else if (inputs.platform === Platform.CLI) {
<<<<<<< HEAD
    const messageKey = "core.projectVersionChecker.cliUseNewVersion";
    TOOLS.logProvider.warning(getLocalizedString(messageKey));
    return IncompatibleProjectError(messageKey);
  } else {
    const messageKey = "core.projectVersionChecker.vs.incompatibleProject";
    const message = getLocalizedString(messageKey);
    TOOLS.ui.showMessage("warn", message, false, learnMoreText).then((res) => {
      if (res.isOk() && res.value === learnMoreText) {
        TOOLS.ui.openUrl(learnMoreLink);
      }
    });
    return IncompatibleProjectError(messageKey);
=======
    TOOLS?.logProvider.warning(getLocalizedString("core.projectVersionChecker.cliUseNewVersion"));
  } else if (inputs.platform === Platform.VS) {
    const res = await TOOLS?.ui.showMessage(
      "warn",
      getLocalizedString("core.projectVersionChecker.vs.incompatibleProject"),
      false,
      learnMoreText
    );
    if (res.isOk() && res.value === learnMoreText) {
      TOOLS?.ui!.openUrl(learnMoreLink);
    }
>>>>>>> 598a7e18e74a2811cdd5bce418d8bb37baaae213
  }
}

function checkMethod(ctx: CoreHookContext): boolean {
  if (ctx.method && methods.has(ctx.method) && userCancelFlag) return false;
  userCancelFlag = ctx.method != undefined && methods.has(ctx.method);
  return true;
}
