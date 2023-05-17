// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface UpdateLaunchUrlInLaunchSettingsArgs {
  target: string; // The path of the laucnSettings.json file
  profile: string; // The profile name
  launchUrl: string; // The launch url
  addLoginHint: boolean; // Whether to add login hint
}
