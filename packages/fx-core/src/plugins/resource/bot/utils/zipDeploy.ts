// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export function getZipDeployEndpoint(siteName: string): string {
  return `https://${siteName}.scm.azurewebsites.net/api/zipdeploy`;
}
