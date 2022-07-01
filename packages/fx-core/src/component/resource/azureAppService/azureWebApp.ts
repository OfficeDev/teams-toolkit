// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Service } from "typedi";
import { AzureAppService } from "./azureAppService";
@Service("azure-web-app")
export class AzureWebAppResource extends AzureAppService {
  readonly name = "azure-web-app";
  readonly alias = "WA";
  readonly displayName = "Azure Web App";
  readonly bicepModuleName = "azureWebApp";
  readonly outputs = {
    resourceId: {
      key: "resourceId",
      bicepVariable: "provisionOutputs.azureWebAppOutput.value.resourceId",
    },
    domain: {
      key: "domain",
      bicepVariable: "provisionOutputs.azureWebAppOutput.value.domain",
    },
    endpoint: {
      key: "endpoint",
      bicepVariable: "provisionOutputs.azureWebAppOutput.value.endpoint",
    },
    appName: {
      key: "appName",
      bicepVariable: "provisionOutputs.azureWebAppOutput.value.appName",
    },
  };
  readonly finalOutputKeys = ["resourceId", "endpoint"];
}
