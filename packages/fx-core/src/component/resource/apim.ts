// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "reflect-metadata";
import { Service } from "typedi";
import { ComponentNames, APIMOutputs } from "../constants";
import { AzureResource } from "./azureResource";
@Service(ComponentNames.Identity)
export class APIMResource extends AzureResource {
  readonly name = ComponentNames.APIM;
  readonly bicepModuleName = ComponentNames.APIM;
  outputs = APIMOutputs;
  finalOutputKeys = ["serviceResourceId", "productResourceId", "authServerResourceId"];
  secretKeys = ["apimClientAADClientSecret"];
}
