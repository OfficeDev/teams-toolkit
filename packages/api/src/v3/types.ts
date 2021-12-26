// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { EnvConfig } from "../schemas";
import { EnvInfoV2 } from "../v2/types";
import { ResourceStates, TeamsFxAzureResourceStates } from "./resourceStates";

/**
 * Upgrade EnvInfoV2, specify the state type as ResourceStates
 */
export interface EnvInfoV3 extends EnvInfoV2 {
  state: ResourceStates;
}

export interface TeamsFxAzureEnvInfo extends EnvInfoV3 {
  state: TeamsFxAzureResourceStates;
  config: EnvConfig;
}
