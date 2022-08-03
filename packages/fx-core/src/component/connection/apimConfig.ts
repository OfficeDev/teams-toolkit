// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "reflect-metadata";
import { Service } from "typedi";
import { ComponentNames } from "../constants";
import { ComponentConnections } from "../utils";
import { AzureResourceConfig } from "./azureResourceConfig";
@Service("apim-config")
export class APIMConfig extends AzureResourceConfig {
  readonly name = "apim-config";
  readonly bicepModuleName = "apim";
  readonly requisite = "apim";
  references = ComponentConnections[ComponentNames.APIM];
}
