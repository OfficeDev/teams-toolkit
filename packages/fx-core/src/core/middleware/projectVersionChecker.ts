// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, Inputs, Platform } from "@microsoft/teamsfx-api";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { CoreHookContext } from "../types";
import { TOOLS } from "../globalVars";
import { getLocalizedString } from "../../common/localizeUtils";
import { loadProjectSettings } from "./projectSettingsLoader";
import semver from "semver";

let userCancelFlag = false;
const methods: Set<string> = new Set(["getProjectConfig", "checkPermission"]);

const currentSupportProjectVersion = "< 3.0.0";

export const ProjectVersionCheckerMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  if ((await needToShowUpdateDialog(ctx)) && checkMethod(ctx)) {
    showDialog(ctx);
  }

  await next();
};

async function needToShowUpdateDialog(ctx: CoreHookContext) {
  const lastArg = ctx.arguments[ctx.arguments.length - 1];
  const inputs: Inputs = lastArg === ctx ? ctx.arguments[ctx.arguments.length - 2] : lastArg;
  const loadRes = await loadProjectSettings(inputs, true);
  if (loadRes.isErr()) {
    ctx.result = err(loadRes.error);
    return false;
  }

  const projectSettings = loadRes.value;

  const currentProjectVersion = projectSettings.version;
  if (currentProjectVersion) {
    if (!semver.satisfies(currentProjectVersion, currentSupportProjectVersion)) {
      return true;
    }
  }
  return false;
}

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
  }
}

function checkMethod(ctx: CoreHookContext): boolean {
  if (ctx.method && methods.has(ctx.method) && userCancelFlag) return false;
  userCancelFlag = ctx.method != undefined && methods.has(ctx.method);
  return true;
}
