// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";

export interface SelectTeamsManifestInputs extends Inputs {
  /** @description Select Teams manifest.json file */
  "manifest-path"?: string;
}
