// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureHosting } from "./azureHosting";
import { ServiceType } from "./interfaces";
import { TokenProvider, Void } from "@microsoft/teamsfx-api";
import { azureWebSiteDeploy } from "./utils";
import { AzureOperations } from "./azureOps";
import { getResourceGroupNameFromResourceId, getSiteNameFromResourceId } from "../tools";

const functionResourceId = "provisionOutputs.functionOutput.value.botWebAppResourceId";
const functionHostName = "provisionOutputs.functionOutput.value.validDomain";
const functionEndpoint = "provisionOutputs.functionOutputs.value.functionEndpoint";
const endpointAsParam = "botFunctionProvision.outputs.functionEndpoint";

export class AzureFunctionHosting extends AzureHosting {
  configurable = true;
  hostType = ServiceType.Functions;
  reference = {
    resourceId: functionResourceId,
    hostName: functionHostName,
    functionEndpoint: functionEndpoint,
    endpointAsParam: endpointAsParam,
  };

  async deploy(resourceId: string, tokenProvider: TokenProvider, buffer: Buffer): Promise<Void> {
    await super.deploy(resourceId, tokenProvider, buffer);
    const client = await azureWebSiteDeploy(resourceId, tokenProvider, buffer);

    await AzureOperations.restartWebApp(
      client,
      getResourceGroupNameFromResourceId(resourceId),
      getSiteNameFromResourceId(resourceId)
    );
    return Void;
  }
}
