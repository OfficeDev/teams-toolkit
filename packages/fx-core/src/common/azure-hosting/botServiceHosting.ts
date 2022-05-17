// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ServiceType } from "./interfaces";
import { AzureService } from "./azureService";

export class BotServiceHosting extends AzureService {
  configurable = false;
  hostType = ServiceType.BotService;
}
