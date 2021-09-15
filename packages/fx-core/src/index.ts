// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import "reflect-metadata";

export * from "./common";
export * from "./plugins";
export * from "./core";
export * from "./folder";
export * from "./core/environment";
export * from "./common/localSettingsProvider";
export { setActiveEnv } from "./core/middleware/envInfoLoader";
