// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import { Dialog, DialogMsg, DialogType, QuestionType } from "fx-api";
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
  return await displayWarningMessage(message, "Learn more", () => {
    openUrl(link);
    return Promise.resolve(true);
  });
}

export async function displayWarningMessage(
  message: string,
  buttonText: string,
  action: () => Promise<boolean>
): Promise<boolean> {
  const answer = await _dialog?.communicate(new DialogMsg(
    DialogType.Ask,
    {
      type: QuestionType.Radio,
      description: message,
      defaultAnswer: "Cancel",
      options: [buttonText, "Cancel"],
    }
  ));
  if (answer?.getAnswer() === buttonText) {
    return await action();
  }

  return false;
}

export function setDialog(dialog: Dialog): void {
  _dialog = dialog;
}

export function showOutputChannel(): void {
  // TODO: find a way to implement in plugin
}

export function getResourceDir(): string {
  return path.resolve(path.join(__dirname, "..", "..", "..", "..", "..", "..", "resource", "plugins", "resource", "function"));
}

let _dialog: Dialog | null;
