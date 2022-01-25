// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { EnvConfig } from "../schemas";
import { ResourceStates } from "./resourceStates";

export interface EnvInfoV3 {
  envName: string;
  // input
  config: EnvConfig;
  // output
  state: ResourceStates;
}

export interface EnvInfoV3Question {
  envName: string;
  // input
  config?: EnvConfig;
  // output
  state?: ResourceStates;
}
