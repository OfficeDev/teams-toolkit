////////////////////AzureBotPlugin.ts////////////////

import { ResourcePlugin } from "./plugins";
import { AzureResource } from "./resourceStates";

export interface AzureWebApp extends AzureResource {
  type: "AzureWebApp";
  endpoint: string;
}

export class AzureWebAppPlugin implements ResourcePlugin {
  name = "AzureWebAppPlugin";
  resourceType = "AzureWebApp";
  description = "Azure Web App";
  modules = ["tab", "bot"];
}
