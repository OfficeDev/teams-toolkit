// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";

export interface SFPxAddWebpartInputs extends Inputs {
  /** @description Directory path that contains the existing SarePoint Framework solutions. */
  "spfx-folder"?: string;
  /** @description Name for SharePoint Framework Web Part. */
  "spfx-webpart-name"?: string;
  /** @description Select Teams manifest.json file */
  "manifest-path"?: string;
  /** @description Select local Teams manifest.json file */
  "local-manifest-path"?: string;
}
