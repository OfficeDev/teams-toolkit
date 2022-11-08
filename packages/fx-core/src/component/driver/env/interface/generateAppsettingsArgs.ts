// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface Appsettings {
  [key: string]: any;
}

export interface GenerateAppsettingsArgs {
  target: string; // The path of the appsettings file
  appsettings: Appsettings;
}
