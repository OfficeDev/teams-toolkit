// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "reflect-metadata";
import { Service } from "typedi";
import { ComponentNames } from "../constants";
import { ComponentConnections } from "../utils";
import { AzureResourceConfig } from "./azureResourceConfig";
@Service("azure-web-app-config")
export class AzureWebAppConfig extends AzureResourceConfig {
  readonly name = "azure-web-app-config";
  readonly bicepModuleName = "azureWebApp";
  readonly requisite = "azure-web-app";
  references = ComponentConnections[ComponentNames.AzureWebApp];
}
