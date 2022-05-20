// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureHosting } from "./azureHosting";
import { ServiceType } from "./interfaces";
import { Inputs, TokenProvider } from "@microsoft/teamsfx-api";
import { Void } from "../../plugins";
import { azureWebSiteDeploy } from "./utils";
import { AzureOperations } from "./azureOps";

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

  async deploy(
    inputs: Inputs,
    tokenProvider: TokenProvider,
    buffer: Buffer,
    siteName: string
  ): Promise<Void> {
    await super.deploy(inputs, tokenProvider, buffer, siteName);
    const client = await azureWebSiteDeploy(inputs, tokenProvider, buffer, siteName);
    await AzureOperations.restartWebApp(client, inputs.resourceGroupName, siteName);
    return Void;
  }
}
