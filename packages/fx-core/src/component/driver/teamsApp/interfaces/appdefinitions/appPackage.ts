// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface AppPackage {
  manifest?: Buffer;
  icons?: Partial<{
    color: Buffer;
    outline: Buffer;
  }>;
  languages?: Record<string, Buffer>;
}
