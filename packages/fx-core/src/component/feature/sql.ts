// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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
import { getComponent } from "../workflow";
import "../connection/azureWebAppConfig";
import { AzureSqlResource } from "../resource/azureSql";
import "../resource/identity";
import { ComponentNames } from "../constants";
import { hasApi } from "../../common/projectSettingsHelperV3";
import { convertToAlphanumericOnly } from "../../common/utils";
import { BicepComponent } from "../bicep";
import { generateConfigBiceps, bicepUtils, addFeatureNotify } from "../utils";
import { cloneDeep } from "lodash";
import {
  AzureResourceFunction,
  AzureResourceSQL,
} from "../../plugins/solution/fx-solution/question";
import { getLocalizedString } from "../../common/localizeUtils";
import { format } from "util";

@Service("sql")
export class Sql {
  name = "sql";

  async add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const addedResources: string[] = [];
    const sqlComponent = getComponent(context.projectSetting, ComponentNames.AzureSQL);
    const hasFunc = hasApi(context.projectSetting);
    if (!hasFunc) {
      const teamsApi = Container.get(ComponentNames.TeamsApi) as any;
      const res = await teamsApi.add(context, inputs);
      if (res.isErr()) return err(res.error);
      addedResources.push(AzureResourceFunction.id);
    }
    const projectSettings = context.projectSetting;
    projectSettings.components.push({
      name: "azure-sql",
      provision: true,
    });

    // generate bicep
    // bicep.init
    {
      const bicepComponent = Container.get<BicepComponent>("bicep");
      const res = await bicepComponent.init(inputs.projectPath);
      if (res.isErr()) return err(res.error);
    }

    // sql bicep
    {
      const provisionType = sqlComponent ? "database" : "server";
      const clonedInputs = cloneDeep(inputs);
      clonedInputs.provisionType = provisionType;
      const sqlResource = Container.get<AzureSqlResource>(ComponentNames.AzureSQL);
      const res = await sqlResource.generateBicep(context, clonedInputs);
      if (res.isErr()) return err(res.error);
      const bicepRes = await bicepUtils.persistBiceps(
        inputs.projectPath,
        convertToAlphanumericOnly(context.projectSetting.appName),
        res.value
      );
      if (bicepRes.isErr()) return bicepRes;
    }

    // generate config bicep
    {
      const res = await generateConfigBiceps(context, inputs);
      if (res.isErr()) return err(res.error);
    }
    addedResources.push(AzureResourceSQL.id);
    // notification
    addFeatureNotify(inputs, context.userInteraction, "Resource", addedResources);
    return ok(undefined);
  }
}
