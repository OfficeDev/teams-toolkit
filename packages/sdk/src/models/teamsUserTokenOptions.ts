// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { GetTokenOptions } from "@azure/identity";

export interface GetTeamsUserTokenOptions extends GetTokenOptions {
  resources?: string[];
}
