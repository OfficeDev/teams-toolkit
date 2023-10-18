// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface AddWebPartArgs {
  /**
   * Teams app manifest template path
   */
  manifestPath: string;
  /**
   * Teams app manifest template path for local
   */
  localManifestPath: string;
  /**
   * Newly added web part name
   */
  webpartName: string;
  /**
   * SPFx solution directory
   */
  spfxFolder: string;
  /**
   * Whether use globally installed SPFx or locally installed SPFx
   */
  spfxPackage: string;
}
