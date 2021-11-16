// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Plugin,
  PluginContext,
  SystemError,
  UserError,
  err,
  AzureSolutionSettings,
  Result,
  FxError,
} from "@microsoft/teamsfx-api";
import {
  AzureResourceKeyVault,
  HostTypeOptionAzure,
  TabOptionItem,
} from "../../solution/fx-solution/question";
import { KeyVaultPluginImpl } from "./plugin";
import { Service } from "typedi";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import { isArmSupportEnabled, isVsCallingCli } from "../../..";
import { ArmTemplateResult } from "../../../common/armInterface";

@Service(ResourcePlugins.KeyVaultPlugin)
export class KeyVaultPlugin implements Plugin {
  name = "fx-resource-key-vault";
  displayName = "Key Vault";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    const cap = solutionSettings.capabilities || [];
    const azureResources = solutionSettings.azureResources || [];
    return (
      solutionSettings.hostType === HostTypeOptionAzure.id &&
      azureResources.includes(AzureResourceKeyVault.id)
    );
  }
  keyVaultPluginImpl = new KeyVaultPluginImpl();

  public async generateArmTemplates(
    ctx: PluginContext
  ): Promise<Result<ArmTemplateResult, FxError>> {
    return this.keyVaultPluginImpl.generateArmTemplates(ctx);
  }
}

export default new KeyVaultPlugin();
