// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";

export interface PreviewTeamsAppInputs extends Inputs {
  /** @description Platform */
  "m365-host"?: "teams" | "outlook" | "office";
  /** @description Select Teams manifest.json file */
  "manifest-path"?: string;
}
