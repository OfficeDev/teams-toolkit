////////////////////AzureFunctionPlugin.ts////////////////
import { ok } from "neverthrow";
import { AzureAccountProvider, FxError, Result, Void } from "..";
import { Context, ProvisionInputs } from "../v2";
import { AzureSQL } from "./AzureSQLPlugin";
import { ResourcePlugin } from "./plugins";
import { ResourceStates, TeamsFxAzureResourceStates } from "./resourceStates";

export class AzureFunctionPlugin implements ResourcePlugin {
  name = "AzureFunctionPlugin";
  resourceType = "AzureFunction";
  description = "Azure Function App";
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
