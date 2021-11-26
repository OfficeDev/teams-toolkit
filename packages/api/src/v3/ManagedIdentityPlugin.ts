////////////////////ManagedIdentityPlugin.ts////////////////

import { ResourcePlugin } from "./plugins";
import { AzureResource } from "./resourceModel";

export interface AzureManagedIdentity extends AzureResource {
  type: "AzureManagedIdentity";
  clientId: string;
}

export class ManagedIdentityPlugin implements ResourcePlugin {
  name = "fx-resource-azure-identity";
  resourceType = "AzureManagedIdentity";
  description = "Managed Identity";
}
