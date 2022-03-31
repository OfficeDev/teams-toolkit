// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, PluginContext, Result } from "@microsoft/teamsfx-api";

export interface DependencyChecker {
  ensureDependency(ctx: PluginContext): Promise<Result<boolean, FxError>>;
  isInstalled(): Promise<boolean>;
  install(): Promise<void>;
}

export interface DependencyInfo {
  supportedVersion: string;
  displayName: string;
}
