// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureHosting } from "./azureHosting";

const functionResourceId = "provisionOutputs.functionOutput.value.resourceId";
const functionHostName = "provisionOutputs.functionOutput.value.validDomain";
const functionEndpoint = "provisionOutputs.functionOutputs.value.functionEndpoint";
const endpointAsParam = "functionProvision.outputs.functionEndpoint";

export class FunctionHosting extends AzureHosting {
  configurable = true;
  hostType = "function";
  reference = {
    resourceId: functionResourceId,
    hostName: functionHostName,
    functionEndpoint: functionEndpoint,
    endpointAsParam: endpointAsParam,
  };
}
