// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  ActionContext,
  Component,
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
import { hasApi } from "../../common/projectSettingsHelperV3";
import { convertToAlphanumericOnly } from "../../common/utils";
import { AzureResourceApim, AzureResourceFunction } from "../../plugins";
import { buildAnswer } from "../../plugins/resource/apim/answer";
import { ApimPluginConfig } from "../../plugins/resource/apim/config";
import {
  PluginLifeCycle,
  ProgressMessages,
  ProgressStep,
} from "../../plugins/resource/apim/constants";
import { Factory } from "../../plugins/resource/apim/factory";
import { BicepComponent } from "../bicep";
import { ComponentNames } from "../constants";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { APIMResource } from "../resource/apim";
import { generateConfigBiceps, bicepUtils } from "../utils";
import { getComponent } from "../workflow";
import * as util from "util";
@Service(ComponentNames.APIMFeature)
export class ApimFeature {
  name = ComponentNames.APIMFeature;
  async add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const addedResources: string[] = [];
    const component = getComponent(context.projectSetting, ComponentNames.APIM);
    if (component) return ok(undefined);
    const hasFunc = hasApi(context.projectSetting);
    // 1. call teams-api.add if necessary
    if (!hasFunc) {
      const teamsApi = Container.get(ComponentNames.TeamsApi) as any;
      const res = await teamsApi.add(context, inputs);
      if (res.isErr()) return err(res.error);
      addedResources.push(AzureResourceFunction.id);
    }

    // 2. scaffold
    {
      const codeRes = await this.generateCode(context, inputs);
      if (codeRes.isErr()) return err(codeRes.error);
    }

    // 3. config
    const apimConfig: Component = {
      name: ComponentNames.APIM,
      provision: true,
      deploy: true,
      connections: [],
    };
    context.projectSetting.components.push(apimConfig);
    // 4. bicep.init
    {
      const bicepComponent = Container.get<BicepComponent>("bicep");
      const res = await bicepComponent.init(inputs.projectPath);
      if (res.isErr()) return err(res.error);
    }

    // 5. apim.generateBicep
    {
      const apimResource = Container.get<APIMResource>(ComponentNames.APIM);
      const res = await apimResource.generateBicep(context, inputs);
      if (res.isErr()) return err(res.error);
      const bicepRes = await bicepUtils.persistBiceps(
        inputs.projectPath,
        convertToAlphanumericOnly(context.projectSetting.appName),
        res.value
      );
      if (bicepRes.isErr()) return err(bicepRes.error);
    }

    // 6. generate config bicep
    {
      const res = await generateConfigBiceps(context, inputs);
      if (res.isErr()) return err(res.error);
    }
    addedResources.push(AzureResourceApim.id);

    // notification
    const addNames = addedResources.map((c) => `'${c}'`).join(" and ");
    const single = addedResources.length === 1;
    const template =
      inputs.platform === Platform.CLI
        ? single
          ? getLocalizedString("core.addResource.addResourceNoticeForCli")
          : getLocalizedString("core.addResource.addResourcesNoticeForCli")
        : single
        ? getLocalizedString("core.addResource.addResourceNotice")
        : getLocalizedString("core.addResource.addResourcesNotice");
    context.userInteraction.showMessage("info", util.format(template, addNames), false);

    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      errorSource: "APIM",
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-apim",
      telemetryEventName: "scaffold",
      enableProgressBar: true,
      progressTitle: ProgressStep.Scaffold,
      progressSteps: Object.keys(ProgressMessages[ProgressStep.Scaffold]).length,
    }),
  ])
  async generateCode(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const apimConfig = new ApimPluginConfig({}, "");
    const answer = buildAnswer(inputs);
    const scaffoldManager = await Factory.buildScaffoldManager(
      context.telemetryReporter,
      context.logProvider
    );
    const appName = convertToAlphanumericOnly(context.projectSetting.appName);
    if (answer.validate) {
      await answer.validate(PluginLifeCycle.Scaffold, apimConfig, inputs.projectPath);
    }
    answer.save(PluginLifeCycle.Scaffold, apimConfig);
    await actionContext?.progressBar?.next(ProgressMessages[ProgressStep.Scaffold].Scaffold);
    await scaffoldManager.scaffold(appName, inputs.projectPath);
    return ok(undefined);
  }
}
