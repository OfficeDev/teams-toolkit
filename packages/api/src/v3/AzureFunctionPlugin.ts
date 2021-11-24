import { ok } from "neverthrow";
import { AzureAccountProvider, FxError, Result, Void } from "..";
import { OptionItem } from "../qm";
import { Context, ProvisionInputs } from "../v2";
import { ResourcePlugin } from "./plugins";
import { ResourceStates, TeamsFxAzureResourceStates } from "./resourceStates";
import { AzureSQL } from "./AzureSQLPlugin";

export class AzureFunctionPlugin implements ResourcePlugin {
  name = "AzureFunctionPlugin";
  option: OptionItem = {
    id: "AzureFunctionPlugin",
    label: "Azure Function App",
  };
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
