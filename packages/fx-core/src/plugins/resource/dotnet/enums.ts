// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum ConfigKey {
  /* Config from solution */
  resourceGroupName = "resourceGroupName",
  subscriptionId = "subscriptionId",
  resourceNameSuffix = "resourceNameSuffix",
  location = "location",
  credential = "credential",
  teamsAppName = "teamsAppName",
  projectDir = "dir",
  buildPath = "buildPath",
  runtime = "runtime",

  /* Config exported by Dotnet plugin */
  webAppName = "webAppName",
  webAppEndpoint = "webAppEndpoint",
  webAppDomain = "webAppDomain",
  webAppResourceId = "webAppResourceId",

  /* Intermediate */
  site = "site",
}
