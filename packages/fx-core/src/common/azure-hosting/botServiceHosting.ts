// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureHosting } from "./azureHosting";

export class BotHosting extends AzureHosting {
  configurable = false;
  hostType = "botservice";
}
