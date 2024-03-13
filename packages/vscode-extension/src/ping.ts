// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as po from "./pong";

export function pong(): string {
  return "this is REAL pong";
}

export function ping(): string {
  return po.pong();
}
