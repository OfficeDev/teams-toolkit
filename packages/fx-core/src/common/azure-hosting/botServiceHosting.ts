// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureHosting } from "./azureHosting";
import { HostType } from "./interfaces";

export class BotServiceHosting extends AzureHosting {
  configurable = false;
  hostType = HostType.BotService;
}
