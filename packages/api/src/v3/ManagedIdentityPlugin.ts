////////////////////ManagedIdentityPlugin.ts////////////////

import { ok } from "neverthrow";
import { FxError, Inputs, Result } from "..";
import { Context } from "../v2";
import { ResourcePlugin } from "./plugins";
import { AzureResource } from "./resourceStates";

export interface AzureManagedIdentity extends AzureResource {
  type: "AzureManagedIdentity";
  clientId: string;
}

export class ManagedIdentityPlugin implements ResourcePlugin {
  name = "AzureBotPlugin";
  resourceType = "AzureBot";
  description = "Azure Bot";
  async pluginDependencies?(ctx: Context, inputs: Inputs): Promise<Result<string[], FxError>> {
    return ok(["AzureWebAppPlugin"]);
  }
}
