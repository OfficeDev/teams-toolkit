// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureHosting } from "./azureHosting";
import { BicepContext, ServiceType } from "./interfaces";
import { ResourceTemplate, TokenProvider, Void } from "@microsoft/teamsfx-api";
import { azureWebSiteDeploy } from "./utils";
import { AzureOperations } from "./azureOps";
import { getResourceGroupNameFromResourceId, getSiteNameFromResourceId } from "../tools";

const endpointAsParam = (moduleName: string): string =>
  `${moduleName}Provision.outputs.functionEndpoint`;

export class AzureFunctionHosting extends AzureHosting {
  configurable = true;
  hostType = ServiceType.Functions;
  reference = {
    endpointAsParam: endpointAsParam("function"),
  };

  async generateBicep(bicepContext: BicepContext): Promise<ResourceTemplate> {
    this.reference.endpointAsParam = endpointAsParam(
      bicepContext.moduleNames[ServiceType.Functions]
    );
    return super.generateBicep(bicepContext);
  }

  async deploy(resourceId: string, tokenProvider: TokenProvider, buffer: Buffer): Promise<Void> {
    await super.deploy(resourceId, tokenProvider, buffer);
    const client = await azureWebSiteDeploy(resourceId, tokenProvider, buffer, this.logger);

    await AzureOperations.restartWebApp(
      client,
      getResourceGroupNameFromResourceId(resourceId),
      getSiteNameFromResourceId(resourceId),
      this.logger
    );
    return Void;
  }
}
