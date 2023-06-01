// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  DeploymentOperation,
  DeploymentsGetResponse,
  ResourceManagementClient,
} from "@azure/arm-resources";

export async function innerGetDeploymentError(
  client: ResourceManagementClient,
  resourceGroupName: string,
  deploymentName: string
): Promise<DeploymentsGetResponse> {
  return client.deployments.get(resourceGroupName, deploymentName);
}

export async function innerGetDeploymentOperations(
  client: ResourceManagementClient,
  resourceGroupName: string,
  deploymentName: string
): Promise<DeploymentOperation[]> {
  const res = [];
  for await (const page of client.deploymentOperations
    .list(resourceGroupName, deploymentName)
    .byPage({ maxPageSize: 100 })) {
    res.push(...page);
  }
  return res;
}
