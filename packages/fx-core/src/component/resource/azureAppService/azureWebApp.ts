// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Service } from "typedi";
import { IdentityOutputs, WebAppOutputs } from "../../constants";
import { AzureAppService } from "./azureAppService";
@Service("azure-web-app")
export class AzureWebAppResource extends AzureAppService {
  readonly name = "azure-web-app";
  readonly alias = "WA";
  readonly displayName = "Azure Web App";
  readonly bicepModuleName = "azureWebApp";
  readonly outputs = WebAppOutputs;
  readonly finalOutputKeys = ["resourceId", "endpoint"];
  templateContext = {
    identity: {
      resourceId: IdentityOutputs.identityResourceId.bicepVariable,
    },
  };
}
