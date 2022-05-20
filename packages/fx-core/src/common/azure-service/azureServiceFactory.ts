// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureFunctions } from "./azureFunctions";
import { AzureService } from "./azureService";
import { AzureBotService } from "./azureBotService";
import { ServiceType } from "./interfaces";
import { AzureAppServiceHosting } from "./azureAppService";

const HostingMap: { [key: string]: () => AzureService } = {
  [ServiceType.Functions]: () => new AzureFunctions(),
  [ServiceType.BotService]: () => new AzureBotService(),
  [ServiceType.AppService]: () => new AzureAppServiceHosting(),
};

export class AzureServiceFactory {
  static createAzureService(serviceType: ServiceType): AzureService {
    if (HostingMap[serviceType] !== undefined) {
      return HostingMap[serviceType]();
    }

    throw new Error(`Host type '${serviceType}' is not supported.`);
  }
}
