////////////////////AzureBotPlugin.ts////////////////

import { ResourcePlugin } from "./plugins";
import { AzureResource } from "./resourceModel";

export interface AzureStorage extends AzureResource {
  type: "AzureStorage";
  endpoint: string;
}

export class AzureStoragePlugin implements ResourcePlugin {
  name = "AzureStoragePlugin";
  resourceType = "AzureStorage";
  description = "Azure Storage";
  modules = ["tab"];
}
