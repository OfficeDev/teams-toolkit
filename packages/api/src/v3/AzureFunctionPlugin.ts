////////////////////AzureFunctionPlugin.ts////////////////
import { ok } from "neverthrow";
import { AzureAccountProvider, FxError, Inputs, Result, Void } from "..";
import { Context, DeepReadonly } from "../v2";
import { AzureSQL } from "./AzureSQLPlugin";
import { EnvInfoV3, ResourcePlugin } from "./plugins";
import { TeamsFxAzureResourceStates } from "./resourceModel";

export class AzureFunctionPlugin implements ResourcePlugin {
  name = "fx-resource-azure-function";
  resourceType = "AzureFunction";
  description = "Azure Function App";
  async configureResource(
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    const teamsFxResourceStates = envInfo.state as TeamsFxAzureResourceStates;
    if (teamsFxResourceStates.resources) {
      const sql = teamsFxResourceStates["fx-resource-azure-sql"];
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
