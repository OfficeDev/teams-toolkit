// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";

export interface SFPxAddWebpartInputs extends Inputs {
  /** @description Directory or Path that contains the existing SharePoint Framework solution. */
  "spfx-folder"?: string;
  /** @description Name for SharePoint Framework Web Part. */
  "spfx-webpart-name"?: string;
  /** @description Select Teams manifest.json file */
  "manifest-path"?: string;
  /** @description Select local Teams manifest.json file */
  "local-manifest-path"?: string;
}
