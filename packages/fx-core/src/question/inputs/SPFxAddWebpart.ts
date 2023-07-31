// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface SPFxAddWebpart {
  /**
   * @description: SPFx solution folder
   */
  spfxFolder: string;
  /**
   * @description: Web Part Name
   */
  spfxWebpartName: string;
  /**
   * @description: Select Teams manifest.json file
   */
  manifestPath: string;
  /**
   * @description: Select local Teams manifest.json file
   */
  localManifestPath: string;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const SPFxAddWebpartOptions = [
  {
    name: "spfx-folder",
    type: "folder",
  },

  {
    name: "spfx-webpart-name",
    type: "text",
  },

  {
    name: "manifest-path",
    type: "singleFile",
  },

  {
    name: "local-manifest-path",
    type: "singleFile",
  },
];
