// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export type CreateAadAppOutput = {
  clientId?: string;
  objectId?: string;
  tenantId?: string;
  authorityHost?: string;
  authority?: string;
  clientSecret?: string; // there will be no client secret if generateClientSecret parameter is false
};

// The const is used to reference the property name in CreateAadAppOutput. When renaming the properties in CreateAadAppOutput, you need to update the const as well.
export const OutputKeys = {
  clientId: "clientId",
  objectId: "objectId",
  tenantId: "tenantId",
  authorityHost: "authorityHost",
  authority: "authority",
  clientSecret: "clientSecret",
};
