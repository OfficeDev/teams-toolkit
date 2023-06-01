// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as os from "os";

export function isWindows(): boolean {
  return os.type() === "Windows_NT";
}
