// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface DependencyChecker {
  install(targetVersion: string): Promise<void>;
}
