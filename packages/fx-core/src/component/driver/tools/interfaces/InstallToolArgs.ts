// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface InstallToolArgs {
  /**
   * trust local certificate
   */
  devCert?: DevCertArgs;

  /**
   * trust local certificate
   */
  func?: FuncArgs;
}

interface DevCertArgs {
  trust: boolean;
}

interface FuncArgs {
  version: number;
}
