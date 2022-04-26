// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureHosting } from "./azureHosting";
import { FunctionHosting } from "./functionHosting";
import { BotHosting } from "./botServiceHosting";
import { HostType } from "./interface";

export class HostingResourceFactory {
  static createHosting(hostTypes: HostType[]): AzureHosting[] {
    const hosting: AzureHosting[] = [];
    if (hostTypes.includes(HostType.Function)) {
      hosting.push(new FunctionHosting());
    }

    hosting.push(new BotHosting());
    return hosting;
  }
}
