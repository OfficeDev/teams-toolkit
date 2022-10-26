// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface DeploySPFxArgs {
  /**
   * create app catalog if there is no valid one in the
   * current Microsoft 365 tenant, default to 'false'
   */
  createAppCatalogIfNotExist: boolean;

  /**
   * the 'package-solution.json' path of the SPFx project,
   * will use it to get the bundled zipped file path.
   */
  packageSolutionPath: string;
}
