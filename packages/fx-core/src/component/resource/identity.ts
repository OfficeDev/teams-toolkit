// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "reflect-metadata";
import { Service } from "typedi";
import { ComponentNames, IdentityOutputs } from "../constants";
import { AzureResource } from "./azureResource";
@Service(ComponentNames.Identity)
export class IdentityResource extends AzureResource {
  readonly name = ComponentNames.Identity;
  readonly bicepModuleName = ComponentNames.Identity;
  outputs = IdentityOutputs;
  finalOutputKeys = ["identityResourceId", "identityName", "identityClientId"];
}
