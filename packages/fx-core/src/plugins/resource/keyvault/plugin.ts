// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, ok, PluginContext, Result } from "@microsoft/teamsfx-api";
import * as path from "path";
import * as fs from "fs-extra";
import { getTemplatesFolder } from "../../..";
import { ScaffoldArmTemplateResult, ArmTemplateResult } from "../../../common/armInterface";
import { generateBicepFiles, isArmSupportEnabled, isMultiEnvEnabled } from "../../../common";
import { Bicep, ConstantString } from "../../../common/constants";
import { Constants } from "./constants";

export class KeyVaultPluginImpl {
  public async generateArmTemplates(
    ctx: PluginContext
  ): Promise<Result<ArmTemplateResult, FxError>> {
    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "keyvault",
      "bicep"
    );

    const provisionModuleResult = path.join(
      bicepTemplateDirectory,
      Constants.provisionModuleTemplateFileName
    );

    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: await fs.readFile(
          path.join(bicepTemplateDirectory, Bicep.ProvisionFileName),
          ConstantString.UTF8Encoding
        ),
        Modules: {
          keyVault: await fs.readFile(provisionModuleResult, ConstantString.UTF8Encoding),
        },
      },
    };

    return ok(result);
  }
}
