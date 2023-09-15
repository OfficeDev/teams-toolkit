// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface InstallToolArgs {
  /**
   * trust local certificate
   */
  devCert?: DevCertArgs;

  /**
   * Install Azure Functions Core Tools
   */
  func?: FuncArgs;

  /**
   * Install Dotnet
   */
  dotnet?: boolean;

  /**
   * Install Test Tool
   */
  testTool?: TestToolArgs;
}

interface DevCertArgs {
  trust: boolean;
}

interface FuncArgs {
  version: string | number;
  symlinkDir?: string;
}

interface TestToolArgs {
  version: string | number;
  symlinkDir: string;
  // check and update interval, in milliseconds
  // negative value for skip update
  updateInterval?: number;
}
