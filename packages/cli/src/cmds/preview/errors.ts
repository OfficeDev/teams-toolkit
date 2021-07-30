// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  FxError,
  returnSystemError,
  returnUserError,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import * as util from "util";

import * as constants from "../../constants";
import { Browser } from "./constants";

export function WorkspaceNotSupported(workspaceFolder: string): UserError {
  return returnUserError(
    new Error(`Workspace '${workspaceFolder}' is not supported.`),
    constants.cliSource,
    "WorkspaceNotSupported"
  );
}

export function ExclusiveLocalRemoteOptions(): UserError {
  return returnUserError(
    new Error("Options --local and --remote are exclusive."),
    constants.cliSource,
    "ExclusiveLocalRemoteOptions"
  );
}

export function RequiredPathNotExists(path: string): UserError {
  return returnUserError(
    new Error(`Required path '${path}' does not exist.`),
    constants.cliSource,
    "RequiredPathNotExists"
  );
}

export function TaskFailed(taskTitle: string): UserError {
  let words = taskTitle.split(" ");
  words = words.map((word) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  return returnUserError(
    new Error(`Task '${taskTitle}' failed.`),
    constants.cliSource,
    `${words.join("")}Failed`
  );
}

export function PreviewCommandFailed(fxErrors: FxError[]): UserError {
  const errors = fxErrors.map((error) => {
    return `${error.source}.${error.name}`;
  });
  return returnUserError(
    new Error(`The preview command failed: ${errors.join(", ")}.`),
    constants.cliSource,
    "PreviewCommandFailed"
  );
}

export function TeamsAppIdNotExists(): UserError {
  return returnUserError(
    new Error("Teams app id does not exists."),
    constants.cliSource,
    "TeamsAppIdNotExists"
  );
}

export function PortsAlreadyInUse(portsInUse: number[]): UserError {
  const message =
    portsInUse.length > 1
      ? util.format(
          "Ports: %s are already in use. Close these ports and try again.",
          portsInUse.join(", ")
        )
      : util.format("Port: %s is already in use. Close this port and try again.", portsInUse[0]);
  return returnUserError(new Error(message), constants.cliSource, "PortsAlreadyInUse");
}

export function PreviewWithoutProvision(): UserError {
  return returnUserError(
    new Error("Provision and deploy commands are required before preview from remote."),
    constants.cliSource,
    "PreviewWithoutProvision"
  );
}

export function OpeningBrowserFailed(browser: Browser): UserError {
  return returnUserError(
    new Error(`Failed to open ${browser} browser. Check if ${browser} exists on your system.`),
    constants.cliSource,
    "OpeningBrowserFailed"
  );
}

export function NoUrlForSPFxRemotePreview(): UserError {
  return returnUserError(
    new Error(
      "SPFx remote preview need your SharePoint site url, pls input sharepoint-site parameter."
    ),
    constants.cliSource,
    "NoUrlForSPFxRemotePreview"
  );
}

export function InvalidSharePointSiteURL(error: Error): UserError {
  return returnUserError(new Error(error.message), constants.cliSource, "InvalidSharePointSiteURL");
}
export function DependencyCheckerFailed(): SystemError {
  return returnSystemError(
    new Error("dependency checker failed."),
    constants.cliSource,
    "DependencyCheckerFailed"
  );
}
