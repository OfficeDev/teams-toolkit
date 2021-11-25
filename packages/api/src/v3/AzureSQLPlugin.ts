////////////////////AzureSQLPlugin.ts////////////////
import { ok } from "neverthrow";
import { FxError, Inputs, Result } from "..";
import { Context } from "../v2";
import { ResourcePlugin } from "./plugins";
import { AzureResource } from "./resourceModel";

export interface AzureSQL extends AzureResource {
  type: "AzureSQL";
  endpoint: string;
  adminUserName: string;
  databaseName: string;
}

export class AzureSQLPlugin implements ResourcePlugin {
  name = "AzureSQLPlugin";
  resourceType = "AzureSQL";
  description = "Azure Function App will be also selected to access Azure SQL Database";
  async pluginDependencies(ctx: Context, inputs: Inputs): Promise<Result<string[], FxError>> {
    return ok(["ManagedIdentityPlugin"]);
  }
}
