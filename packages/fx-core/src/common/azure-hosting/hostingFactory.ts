// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureFunctionsHosting } from "./azureFunctionsHosting";
import { AzureService } from "./azureService";
import { BotServiceHosting } from "./botServiceHosting";
import { ServiceType } from "./interfaces";
import { AzureAppServiceHosting } from "./azureAppServiceHosting";

const HostingMap: { [key: string]: () => AzureService } = {
  [ServiceType.Functions]: () => new AzureFunctionsHosting(),
  [ServiceType.BotService]: () => new BotServiceHosting(),
  [ServiceType.AppService]: () => new AzureAppServiceHosting(),
};

export class AzureServiceFactory {
  static createHosting(serviceType: ServiceType): AzureService {
    if (HostingMap[serviceType] !== undefined) {
      return HostingMap[serviceType]();
    }

    throw new Error(`Host type '${serviceType}' is not supported.`);
  }
}
