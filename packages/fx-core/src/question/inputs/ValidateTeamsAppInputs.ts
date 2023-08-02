// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";

export interface ValidateTeamsAppInputs extends Inputs {
  /** @description Select Teams manifest.json file */
  "manifest-path"?: string;
  /** @description Select Teams app package file */
  "app-package-file-path"?: string;
}
