// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
  ok,
  Platform,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { getLocalizedString } from "../../common/localizeUtils";
import { convertToAlphanumericOnly } from "../../common/utils";
import { AzureResourceKeyVault } from "../../plugins";
import { BicepComponent } from "../bicep";
import "../connection/azureWebAppConfig";
import { ComponentNames } from "../constants";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import "../resource/azureSql";
import "../resource/identity";
import { KeyVaultResource } from "../resource/keyVault";
import { generateConfigBiceps, bicepUtils } from "../utils";
import { getComponent } from "../workflow";
import * as util from "util";
@Service("key-vault-feature")
export class KeyVaultFeature {
  name = "key-vault-feature";

  /**
   * 1. config keyVault
   * 2. add keyVault provision bicep
   * 3. re-generate resources that connect to key-vault
   * 4. persist bicep
   */
  @hooks([
    ActionExecutionMW({
      errorSource: "kv",
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-key-vault",
      telemetryEventName: "generate-arm-templates",
    }),
  ])
  async add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const projectSettings = context.projectSetting;
    const keyVaultComponent = getComponent(projectSettings, ComponentNames.KeyVault);
    if (keyVaultComponent) return ok(undefined);
    // config
    projectSettings.components.push({
      name: ComponentNames.KeyVault,
      connections: [ComponentNames.Identity],
      provision: true,
    });
    // bicep.init
    {
      const bicepComponent = Container.get<BicepComponent>("bicep");
      const res = await bicepComponent.init(inputs.projectPath);
      if (res.isErr()) return err(res.error);
    }
    // key-vault provision bicep
    {
      const keyVaultComponent = Container.get<KeyVaultResource>(ComponentNames.KeyVault);
      const res = await keyVaultComponent.generateBicep(context, inputs);
      if (res.isErr()) return err(res.error);
      const persistRes = await bicepUtils.persistBiceps(
        inputs.projectPath,
        convertToAlphanumericOnly(context.projectSetting.appName),
        res.value
      );
      if (persistRes.isErr()) return persistRes;
    }

    // generate config bicep
    {
      const res = await generateConfigBiceps(context, inputs);
      if (res.isErr()) return err(res.error);
    }

    // notification
    const addNames = AzureResourceKeyVault.id;
    const template =
      inputs.platform === Platform.CLI
        ? getLocalizedString("core.addResource.addResourceNoticeForCli")
        : getLocalizedString("core.addResource.addResourceNotice");
    context.userInteraction.showMessage("info", util.format(template, addNames), false);

    return ok(undefined);
  }
}
