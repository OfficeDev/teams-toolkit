// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ServiceType } from "./interfaces";
import { Inputs, TokenProvider } from "@microsoft/teamsfx-api";
import { Void } from "../../plugins";
import { azureWebSiteDeploy } from "./utils";
import { AzureOperations } from "./azureOps";
import { AzureService } from "./azureService";

const functionResourceId = "provisionOutputs.botFunctionOutput.value.botWebAppResourceId";
const functionHostName = "provisionOutputs.botFunctionOutput.value.validDomain";
const functionEndpoint = "provisionOutputs.botFunctionOutputs.value.functionEndpoint";
const endpointAsParam = "botFunctionProvision.outputs.functionEndpoint";

export class AzureFunctions extends AzureService {
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
