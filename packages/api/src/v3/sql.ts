import { AzureResource } from "./resourceStates";

////////////////////AzureSQL.ts////////////////
export interface AzureSQL extends AzureResource {
  type: "AzureSQL";
  endpoint: string;
  adminUserName: string;
  databaseName: string;
}
