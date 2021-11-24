////////////////////AzureBotPlugin.ts////////////////

import { ok } from "neverthrow";
import { FxError, Inputs, Result } from "..";
import { OptionItem } from "../qm";
import { Context } from "../v2";
import { ResourcePlugin } from "./plugins";
import { AzureResource } from "./resourceStates";

export interface AzureBot extends AzureResource {
  type: "AzureBot";
  endpoint: string;
  botId: string;
  botPassword: string;
  aadObjectId: string; //bot AAD App Id
  appServicePlan: string; // use for deploy
  botChannelReg: string; // Azure Bot
  botRedirectUri?: string; // ???
}

export class AzureBotPlugin implements ResourcePlugin {
  name = "AzureBotPlugin";
  option: OptionItem = {
    id: "AzureBotPlugin",
    label: "Azure Bot",
    description: "Conversational Agent",
  };
  async pluginDependencies?(ctx: Context, inputs: Inputs): Promise<Result<string[], FxError>> {
    return ok(["AzureWebAppPlugin"]);
  }
}
