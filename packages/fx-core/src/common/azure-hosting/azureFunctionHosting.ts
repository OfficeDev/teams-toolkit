// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureHosting } from "./azureHosting";
import { ServiceType } from "./interfaces";

const functionResourceId = "provisionOutputs.functionOutput.value.resourceId";
const functionHostName = "provisionOutputs.functionOutput.value.validDomain";
const functionEndpoint = "provisionOutputs.functionOutputs.value.functionEndpoint";
const endpointAsParam = "functionProvision.outputs.functionEndpoint";

export class AzureFunctionHosting extends AzureHosting {
  configurable = true;
  hostType = ServiceType.Functions;
  reference = {
    resourceId: functionResourceId,
    hostName: functionHostName,
    functionEndpoint: functionEndpoint,
    endpointAsParam: endpointAsParam,
  };
}
