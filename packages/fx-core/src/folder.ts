// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as path from "path";
export function getTemplatesFolder(): string {
  return path.resolve(__dirname, "../templates");
}

export function getResourceFolder(): string {
  return path.resolve(__dirname, "../resource");
}
