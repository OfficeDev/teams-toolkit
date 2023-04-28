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
}

interface DevCertArgs {
  trust: boolean;
}

interface FuncArgs {
  version: string | number;
  symlinkDir?: string;
}
