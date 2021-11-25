////////////////////AadPlugin.ts////////////////

import { ResourcePlugin } from "./plugins";
import { AzureResource } from "./resourceModel";

export interface AadApp extends AzureResource {
  type: "AadApp";
  clientId: string;
  clientSecret: string;
  objectId: string;
  oauth2PermissionScopeId: string;
  tenantId: string;
  oauthHost: string;
  oauthAuthority: string;
  applicationIdUris: string;
}

export class AadPlugin implements ResourcePlugin {
  name = "AadPlugin";
  resourceType = "AadApp";
  description = "AAD App Registration, provide single-sign-on feature for the Teams App";
}
