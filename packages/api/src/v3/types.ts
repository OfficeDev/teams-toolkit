// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { EnvConfig } from "../schemas";
import { EnvInfoV2 } from "../v2/types";
import { ResourceStates } from "./resourceStates";

export interface EnvInfoV3 extends EnvInfoV2 {
  state: ResourceStates;
}

export interface EnvInfoV3Question {
  envName?: string;
  // input
  config?: EnvConfig;
  // output
  state?: ResourceStates;
}
