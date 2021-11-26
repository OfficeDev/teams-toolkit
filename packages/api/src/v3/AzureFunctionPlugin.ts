////////////////////AzureFunctionPlugin.ts////////////////
import { ok } from "neverthrow";
import { AzureAccountProvider, FxError, Result, Void } from "..";
import { Context, ProvisionInputs } from "../v2";
import { AzureSQL } from "./AzureSQLPlugin";
import { ResourcePlugin } from "./plugins";
import { ResourceStates, TeamsFxAzureResourceStates } from "./resourceModel";

export class AzureFunctionPlugin implements ResourcePlugin {
  name = "fx-resource-azure-function";
  resourceType = "AzureFunction";
  description = "Azure Function App";
  async configureResource(
    ctx: Context,
    inputs: ProvisionInputs,
    resourceStates: ResourceStates,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    const teamsFxResourceStates = resourceStates as TeamsFxAzureResourceStates;
    if (teamsFxResourceStates.resources) {
      const sql = teamsFxResourceStates.resources["fx-resource-azure-sql"];
      if (sql && typeof sql === "object") {
        const sqlState = sql as AzureSQL;
        const userName = sqlState.adminUserName;
        const dabatase = sqlState.databaseName;
      }
    }

    //update app settings;
    return ok(Void);
  }
}
