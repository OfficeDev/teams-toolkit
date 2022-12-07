// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface Envs {
  [key: string]: string;
}

export interface GenerateEnvArgs {
  target?: string; // The path of the env file
  envs: Envs;
}
