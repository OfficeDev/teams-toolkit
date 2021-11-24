////////////////////AzureBotPlugin.ts////////////////

import { ResourcePlugin } from "./plugins";
import { AzureResource } from "./resourceStates";

export interface AzureStorage extends AzureResource {
  type: "AzureStorage";
  endpoint: string;
}

export class AzureStoragePlugin implements ResourcePlugin {
  name = "AzureStoragePlugin";
  resourceType = "AzureStorage";
  description = "Azure Storage";
  scopes: ("tab" | "bot" | "backend")[] = ["tab"];
}
