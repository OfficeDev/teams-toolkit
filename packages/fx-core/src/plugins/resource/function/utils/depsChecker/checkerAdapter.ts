// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import { Logger } from "../logger";
import { openUrl } from "./common";

export { cpUtils } from "./cpUtils";
export const logger = Logger;

export function dotnetCheckerEnabled(): boolean {
  // TODO: implement me
  return false;
}

export async function runWithProgressIndicator(
  callback: () => Promise<void>
): Promise<void> {
  // TODO: implement progress indicator in plugin
  await callback();
}

export async function displayLearnMore(message: string, link: string): Promise<boolean> {
  // TODO: implement learn more popup in plugin
  return true;
}

export async function displayWarningMessage(
  message: string,
  buttonText: string,
  action: () => Promise<boolean>
): Promise<boolean> {
  return await action();
}

export async function displayContinueWithLearnMore(
  message: string,
  link: string
): Promise<boolean> {
  return true;
}

export function showOutputChannel(): void {
  // TODO: find a way to implement in plugin
}

export function getResourceDir(): string {
  return path.resolve(path.join(__dirname, "..", "..", "..", "..", "..", "..", "resource", "plugins", "resource", "function"));
}
