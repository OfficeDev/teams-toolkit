// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";

export interface PermissionGrantInputs extends Inputs {
  /** @description Select Teams manifest.json file */
  "manifest-path"?: string;
  /** @description Select an environment */
  env?: string;
  /** @description Select Azure Active Directory manifest.json file */
  "manifest-file-path"?: string;
  /** @description Add owner to Teams/AAD app for the account under the same Microsoft 365 tenant (email) */
  email?: string;
}
