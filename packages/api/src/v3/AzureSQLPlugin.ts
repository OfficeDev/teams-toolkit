import { AzureResource, ResourceStates, TeamsFxAzureResourceStates } from "./resourceStates";
import { ok } from "neverthrow";
import { AzureAccountProvider, FxError, Inputs, Result, Void } from "..";
import { OptionItem } from "../qm";
import { Context, ProvisionInputs } from "../v2";
import { ResourcePlugin } from "./plugins";

////////////////////AzureSQL.ts////////////////
export interface AzureSQL extends AzureResource {
  type: "AzureSQL";
  endpoint: string;
  adminUserName: string;
  databaseName: string;
}

export class AzureSQLPlugin implements ResourcePlugin {
  name = "AzureSQLPlugin";
  option: OptionItem = {
    id: "AzureSQLPlugin",
    label: "Azure SQL Database",
    description: "Azure Function App will be also selected to access Azure SQL Database",
  };
  async pluginDependencies?(ctx: Context, inputs: Inputs): Promise<Result<string[], FxError>> {
    return ok(["ManagedIdentityPlugin"]);
  }
  async configureResource(
    ctx: Context,
    inputs: ProvisionInputs,
    resourceStates: ResourceStates,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    const teamsFxResourceStates = resourceStates as TeamsFxAzureResourceStates;
    const sqlState = teamsFxResourceStates.resources?.filter(
      (r) => r.name === "AzureSQL"
    )[0] as AzureSQL;
    const userName = sqlState.adminUserName;
    const dabatase = sqlState.databaseName;
    //update app settings;
    return ok(Void);
  }
}
