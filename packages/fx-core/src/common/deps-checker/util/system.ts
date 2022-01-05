// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";

export function isWindows(): boolean {
  return os.type() === "Windows_NT";
}

export function isMacOS(): boolean {
  return os.type() === "Darwin";
}

export function isLinux(): boolean {
  return os.type() === "Linux";
}

export function isArm64(): boolean {
  return os.arch() === "arm64";
}
