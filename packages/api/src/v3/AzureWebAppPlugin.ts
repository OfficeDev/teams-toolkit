////////////////////AzureBotPlugin.ts////////////////

import { ResourcePlugin } from "./plugins";
import { AzureResource } from "./resourceModel";

export interface AzureWebApp extends AzureResource {
  type: "AzureWebApp";
  endpoint: string;
}

export class AzureWebAppPlugin implements ResourcePlugin {
  name = "fx-resource-azure-web-app";
  resourceType = "AzureWebApp";
  description = "Azure Web App";
  modules = ["tab", "bot"];
}
