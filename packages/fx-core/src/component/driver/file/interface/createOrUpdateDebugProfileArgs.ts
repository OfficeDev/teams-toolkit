// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface CreateOrUpdateDebugProfileArgs {
  target: string | undefined; // The relative path of the laucnSettings.json file
  name: string; // The debug profile name
  appId: string; // The app id
  loginHint: boolean | undefined; // Whether to add login hint
  host: string | undefined; // Host type, ie: Teams, Outlook, Office
}
