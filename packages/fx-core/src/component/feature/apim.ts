// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  Component,
  ContextV3,
  Effect,
  err,
  FunctionAction,
  FxError,
  GroupAction,
  InputsWithProjectPath,
  IProgressHandler,
  MaybePromise,
  ok,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import Container, { Service } from "typedi";
import { hasApi } from "../../common/projectSettingsHelperV3";
import { convertToAlphanumericOnly } from "../../common/utils";
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
import { Plans } from "../messages";
import { APIMResource } from "../resource/apim";
import { generateConfigBiceps, bicepUtils } from "../utils";
import { getComponent, runAction, runActionByName } from "../workflow";

@Service(ComponentNames.APIMFeature)
export class ApimFeature {
  name = ComponentNames.APIMFeature;
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: FunctionAction = {
      type: "function",
      name: "apim-feature.add",
      execute: async (context, inputs) => {
        const component = getComponent(context.projectSetting, ComponentNames.APIM);
        if (component) return ok([]);

        const effects: Effect[] = [];

        const hasFunc = hasApi(context.projectSetting);

        // 1. call teams-api.add if necessary
        if (!hasFunc) {
          const res = await runActionByName("teams-api.add", context, inputs);
          if (res.isErr()) return err(res.error);
          effects.push("add teams-api");
        }

        // 2. scaffold
        {
          const codeActionRes = await this.generateCode(context, inputs);
          if (codeActionRes.isOk() && codeActionRes.value) {
            const res = await runAction(codeActionRes.value, context, inputs);
            if (res.isErr()) return err(res.error);
            effects.push("scaffold api doc");
          }
        }

        // 3. config
        const apimConfig: Component = {
          name: ComponentNames.APIM,
          provision: true,
          deploy: true,
          connections: [],
        };
        context.projectSetting.components.push(apimConfig);
        effects.push(Plans.addFeature("apim"));
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
          effects.push("generate config biceps");
        }
        effects.push("generate bicep");

        return ok(effects);
      },
    };
    return ok(action);
  }

  generateCode(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "apim-feature.generateCode",
      type: "function",
      errorSource: "APIM",
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-apim",
      telemetryEventName: "scaffold",
      enableProgressBar: true,
      progressTitle: ProgressStep.Scaffold,
      progressSteps: Object.keys(ProgressMessages[ProgressStep.Scaffold]).length,
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([ProgressStep.Scaffold]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath,
        progress?: IProgressHandler
      ) => {
        const remarks: string[] = [ProgressStep.Scaffold];
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
        progress?.next(ProgressMessages[ProgressStep.Scaffold].Scaffold);
        await scaffoldManager.scaffold(appName, inputs.projectPath);
        return ok(remarks);
      },
    };
    return ok(action);
  }
}
