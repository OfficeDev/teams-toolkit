// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureHosting } from "./azureHosting";
import { FunctionHosting } from "./functionHosting";
import { BotHosting } from "./botServiceHosting";
import { HostType } from "./interfaces";

const HostingMap: { [key: string]: () => AzureHosting } = {
  [HostType.Function]: () => new FunctionHosting(),
  [HostType.BotService]: () => new BotHosting(),
};

export class AzureHostingFactory {
  static createHosting(hostType: HostType): AzureHosting {
    if (HostingMap[hostType] !== undefined) {
      return HostingMap[hostType]();
    }

    throw new Error(`Host type '${hostType}' is not supported.`);
  }
}
