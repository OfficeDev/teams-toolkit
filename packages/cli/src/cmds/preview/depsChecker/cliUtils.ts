// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import UI from "../../../userInteraction";
import { CliConfigEnvChecker, UserSettings } from "../../../userSetttings";
import * as os from "os";

export async function showWarningMessage(message: string, button: string): Promise<boolean> {
  const res = await UI.showMessage("info", message, true, button);
  const userSelected: string | undefined = res?.isOk() ? res.value : undefined;
  return userSelected === button;
}

export async function openUrl(url: string): Promise<void> {
  await UI.openUrl(url);
}

export async function checkerEnabled(key: string): Promise<boolean> {
  const result = await UserSettings.getConfigSync();
  if (result.isErr()) {
    return true;
  }

  const config = result.value;

  if (key in config) {
    return config[key] === CliConfigEnvChecker.On;
  } else {
    return true;
  }
}

export function isLinux(): boolean {
  return os.type() === "Linux";
}
