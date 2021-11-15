// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export function getResourceGroupNameFromResourceId(resourceId: string): string {
  const result = parseFromResourceId(/\/resourceGroups\/([^\/]*)\//i, resourceId);
  if (!result) {
    throw new Error(`Cannot parse resource group name from resource id ${resourceId}`);
  }
  return result;
}

export function getSubscriptionIdFromResourceId(resourceId: string): string {
  const result = parseFromResourceId(/\/subscriptions\/([^\/]*)\//i, resourceId);
  if (!result) {
    throw new Error(`Cannot parse subscription id from resource id ${resourceId}`);
  }
  return result;
}

export function getSiteNameFromResourceId(webAppResourceId: string): string {
  const result = parseFromResourceId(
    /providers\/Microsoft.Web\/sites\/([^\/]*)/i,
    webAppResourceId
  );
  if (!result) {
    throw new Error(`Cannot parse site name from resource id ${webAppResourceId}`);
  }
  return result;
}

export function parseFromResourceId(pattern: RegExp, resourceId: string): string {
  const result = resourceId.match(pattern);
  return result ? result[1].trim() : "";
}
