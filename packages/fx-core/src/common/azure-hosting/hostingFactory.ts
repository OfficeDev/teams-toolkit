// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureFunctionHosting } from "./azureFunctionHosting";
import { AzureHosting } from "./azureHosting";
import { ServiceType } from "./interfaces";
import { AzureAppServiceHosting } from "./azureAppServiceHosting";

const HostingMap: { [key: string]: () => AzureHosting } = {
  [ServiceType.Functions]: () => new AzureFunctionHosting(),
  [ServiceType.AppService]: () => new AzureAppServiceHosting(),
};

export class AzureHostingFactory {
  static createHosting(serviceType: ServiceType): AzureHosting {
    if (HostingMap[serviceType] !== undefined) {
      return HostingMap[serviceType]();
    }

    throw new Error(`Host type '${serviceType}' is not supported.`);
  }
}
