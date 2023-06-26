// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface DependencyChecker {
  install(): Promise<void>;
}
