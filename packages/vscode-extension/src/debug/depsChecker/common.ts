/* eslint-disable @typescript-eslint/no-var-requires */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
const opn = require("opn");

export async function openUrl(url: string): Promise<void> {
  // Using this functionality is blocked by https://github.com/Microsoft/vscode/issues/25852
  // Specifically, opening the Live Metrics Stream for Linux Function Apps doesn't work in this extension.
  // await vscode.env.openExternal(vscode.Uri.parse(url));

  opn(url);
}

export function isWindows() {
  return os.type() === "Windows_NT";
}

export function isMacOS() {
  return os.type() === "Darwin";
}

export function isLinux() {
  return os.type() === "Linux";
}
