// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface copyAppPackageToSPFxArgs {
  /**
   * the path of the zipped Teams app package.
   */
  appPackagePath: string;

  /**
   * the source folder of the SPFx project.
   */
  spfxFolder: string;
}
