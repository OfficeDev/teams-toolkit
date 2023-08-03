// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";

export interface DeployAadManifestInputs extends Inputs {
  /** @description Select Azure Active Directory manifest.json file */
  "manifest-file-path"?: string;
  /** @description Select an environment */
  env?: string;
}
