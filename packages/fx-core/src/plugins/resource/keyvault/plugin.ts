// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, ok, PluginContext, Result } from "@microsoft/teamsfx-api";
import * as path from "path";
import * as fs from "fs-extra";
import { getTemplatesFolder } from "../../..";
import { ArmTemplateResult } from "../../../common/armInterface";
import { Bicep, ConstantString } from "../../../common/constants";
import { Constants } from "./constants";
import { ResultFactory } from "./result";

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
        Reference: {
          m365ClientSecretReference: Constants.KeyVaultBicep.m365ClientSecretReference,
          botClientSecretReference: Constants.KeyVaultBicep.botClientSecretReference,
        },
        Modules: {
          keyVault: await fs.readFile(provisionModuleResult, ConstantString.UTF8Encoding),
        },
      },
    };

    return ResultFactory.Success(result);
  }
}
