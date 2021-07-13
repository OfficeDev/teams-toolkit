// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as path from "path";
import "reflect-metadata";

export * from "./common";
export * from "./plugins";
export * from "./core";

export function getTemplatesFolder() {
  return path.resolve(__dirname, "../templates");
}

export function getResourceFolder() {
  return path.resolve(__dirname, "../resource");
}
