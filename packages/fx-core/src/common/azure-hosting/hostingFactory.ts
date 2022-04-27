// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureFunctionHosting } from "./azureFunctionHosting";
import { AzureHosting } from "./azureHosting";
import { BotServiceHosting } from "./botServiceHosting";
import { HostType } from "./interfaces";

const HostingMap: { [key: string]: () => AzureHosting } = {
  [HostType.Function]: () => new AzureFunctionHosting(),
  [HostType.BotService]: () => new BotServiceHosting(),
};

export class AzureHostingFactory {
  static createHosting(hostType: HostType): AzureHosting {
    if (HostingMap[hostType] !== undefined) {
      return HostingMap[hostType]();
    }

    throw new Error(`Host type '${hostType}' is not supported.`);
  }
}
