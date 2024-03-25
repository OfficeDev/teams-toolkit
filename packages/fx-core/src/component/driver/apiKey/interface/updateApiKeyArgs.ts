// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface UpdateApiKeyArgs {
  registrationId: string; // The registration id of the api key
  name: string; // The name of Api Secret
  appId: string; // Teams app id
  apiSpecPath: string; // The location of api spec file
  applicableToApps?: string; // What app can access the api key. Values can be "SpecificApp" or "AnyApp". Default is "AnyApp".
  targetAudience?: string; // What tenant can access the api key. Values can be "HomeTenant" or "AnyTenant". Default is "HomeTenant".
}
