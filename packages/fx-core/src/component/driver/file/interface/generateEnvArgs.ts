// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

interface Envs {
  [key: string]: string;
}

export interface GenerateEnvArgs {
  target?: string; // The path of the env file
  envs: Envs;
}
