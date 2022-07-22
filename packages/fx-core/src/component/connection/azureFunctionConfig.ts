// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "reflect-metadata";
import { Service } from "typedi";
import { ComponentNames } from "../constants";
import { ComponentConnections } from "../utils";
import { AzureResourceConfig } from "./azureResourceConfig";

@Service("azure-function-config")
export class AzureFunctionsConfig extends AzureResourceConfig {
  readonly name = "azure-function-config";
  readonly bicepModuleName = "azureFunction";
  readonly requisite = "azure-function";
  references = ComponentConnections[ComponentNames.Function];
}
