// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Action, ok } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { ComponentNames, IdentityOutputs } from "../constants";
import { getComponent } from "../workflow";
import { AzureResource } from "./azureResource";
@Service(ComponentNames.Identity)
export class IdentityResource extends AzureResource {
  readonly name = ComponentNames.Identity;
  readonly bicepModuleName = ComponentNames.Identity;
  outputs = IdentityOutputs;
  finalOutputKeys = ["identityResourceId", "identityName", "identityClientId"];
}

export const identityAction: Action = {
  name: "call:identity.generateBicep",
  type: "call",
  required: true,
  targetAction: "identity.generateBicep",
  inputs: {
    componentId: "",
    scenario: "",
  },
};
