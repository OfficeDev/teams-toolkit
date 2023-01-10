// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform } from "@microsoft/teamsfx-api";
import { VersionSource, VersionState } from "../../common/versionMetadata";

export interface VersionForMigration {
  currentVersion: string;
  source: VersionSource;
  state: VersionState;
  platform: Platform;
}
