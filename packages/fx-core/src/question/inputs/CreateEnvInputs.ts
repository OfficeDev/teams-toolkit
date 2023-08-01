// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";

export interface CreateEnvInputs extends Inputs {
  /** @description New environment name */
  newTargetEnvName?: string;
  /** @description Select an environment to create copy */
  sourceEnvName?: string;
}
