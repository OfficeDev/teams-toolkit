// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";

export interface SPFxAddWebpart extends Inputs {
  /** @description SPFx solution folder */
  spfxFolder: string;
  /** @description Web Part Name */
  spfxWebpartName: string;
  /** @description Select Teams manifest.json file */
  manifestPath: string;
  /** @description Select local Teams manifest.json file */
  localManifestPath: string;
}
