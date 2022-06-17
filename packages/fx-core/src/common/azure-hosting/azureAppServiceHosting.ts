// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureHosting } from "./azureHosting";
import { ServiceType } from "./interfaces";
import { TokenProvider, Void } from "@microsoft/teamsfx-api";
import { azureWebSiteDeploy } from "./utils";

const resourceId = "provisionOutputs.webAppOutput.value.webAppResourceId";
const hostName = "provisionOutputs.webAppOutput.value.validDomain";
const webAppEndpoint = "provisionOutputs.webAppOutput.value.siteEndpoint";
const endpointAsParam = "webAppProvision.outputs.webAppEndpoint";

export class AzureAppServiceHosting extends AzureHosting {
  configurable = true;
  hostType = ServiceType.AppService;
  reference = {
    resourceId: resourceId,
    hostName: hostName,
    webAppEndpoint: webAppEndpoint,
    endpointAsParam: endpointAsParam,
  };

  async deploy(resourceId: string, tokenProvider: TokenProvider, buffer: Buffer): Promise<Void> {
    await super.deploy(resourceId, tokenProvider, buffer);
    await azureWebSiteDeploy(resourceId, tokenProvider, buffer, this.logger);
    return Void;
  }
}
