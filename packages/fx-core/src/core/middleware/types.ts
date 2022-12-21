// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform } from "@microsoft/teamsfx-api";
import { VersionState } from "../../common/versionMetadata";

export interface VersionForMigration {
  currentVersion: string;
  state: VersionState;
  platform: Platform;
}
