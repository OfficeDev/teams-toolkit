// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  Bicep,
  ContextV3,
  Effect,
  err,
  FxError,
  Inputs,
  InputsWithProjectPath,
  ok,
  ResourceContextV3,
  QTreeNode,
  Result,
  Stage,
  ActionContext,
} from "@microsoft/teamsfx-api";
import { assign, cloneDeep, merge } from "lodash";
import * as path from "path";
import "reflect-metadata";
import Container, { Service } from "typedi";
import { isVSProject } from "../../../common/projectSettingsHelper";
import { TelemetryEvent, TelemetryProperty } from "../../../common/telemetry";
import { convertToAlphanumericOnly } from "../../../common/utils";
import { globalVars } from "../../../core/globalVars";
import { CoreQuestionNames } from "../../../core/question";
import { AzureResourceFunction } from "../../../plugins/solution/fx-solution/question";
import { BicepComponent } from "../../bicep";
import { ApiCodeProvider } from "../../code/api/apiCode";
import { QuestionKey } from "../../code/api/enums";
import { FunctionScaffold } from "../../code/api/scaffold";
import {
  ComponentNames,
  PathConstants,
  ProgrammingLanguage,
  RegularExpr,
  Scenarios,
} from "../../constants";
import { generateLocalDebugSettings } from "../../debug";
import { ErrorMessage } from "../../messages";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { AzureFunctionResource } from "../../resource/azureAppService/azureFunction";
import { generateConfigBiceps, bicepUtils, addFeatureNotify } from "../../utils";
import { getComponent } from "../../workflow";
import { SSO } from "../sso";
import { DefaultValues } from "./constants";
import { functionNameQuestion } from "./question";

@Service(ComponentNames.TeamsApi)
export class TeamsApi {
  name = ComponentNames.TeamsApi;
  @hooks([
    ActionExecutionMW({
      errorSource: "BE",
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.AddFeature,
      telemetryComponentName: ComponentNames.TeamsApi,
      question: (context: ContextV3, inputs: InputsWithProjectPath) => {
        functionNameQuestion.validation = getFunctionNameQuestionValidation(context, inputs);
        return ok(new QTreeNode(functionNameQuestion));
      },
      errorHandler: (error) => {
        if (error && !error?.name) {
          error.name = "addApiError";
        }
        return error as FxError;
      },
    }),
  ])
  async add(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const projectSettings = context.projectSetting;
    const effects: Effect[] = [];
    inputs[CoreQuestionNames.ProgrammingLanguage] =
      context.projectSetting.programmingLanguage ||
      inputs[CoreQuestionNames.ProgrammingLanguage] ||
      ProgrammingLanguage.JS;
    const addedComponents: string[] = [];

    // 1. scaffold function
    {
      inputs[QuestionKey.functionName] ||= DefaultValues.functionName;
      const clonedInputs = cloneDeep(inputs);
      assign(clonedInputs, {
        folder: inputs.folder || PathConstants.apiWorkingDir,
      });
      const apiCodeComponent = Container.get<ApiCodeProvider>(ComponentNames.ApiCode);
      const res = await apiCodeComponent.generate(context, clonedInputs);
      if (res.isErr()) return err(res.error);
      effects.push("generate api code");
    }

    const apiConfig = getComponent(projectSettings, ComponentNames.TeamsApi);
    if (apiConfig) {
      apiConfig.functionNames = apiConfig.functionNames || [];
      apiConfig.functionNames.push(inputs[QuestionKey.functionName]);
      addFeatureNotify(inputs, context.userInteraction, "Resource", [AzureResourceFunction.id]);
      return ok(undefined);
    }

    // 2. config teams-api
    projectSettings.components.push({
      name: ComponentNames.TeamsApi,
      hosting: ComponentNames.Function,
      functionNames: [inputs[QuestionKey.functionName]],
      deploy: true,
      build: true,
      folder: inputs.folder || PathConstants.apiWorkingDir,
      artifactFolder: inputs.folder || PathConstants.apiWorkingDir,
    });
    addedComponents.push(ComponentNames.TeamsApi);
    effects.push("config teams-api");

    // 2.1 check sso if not added
    const tabComponent = getComponent(projectSettings, ComponentNames.TeamsTab);
    if (!tabComponent?.sso) {
      const ssoComponent = Container.get(ComponentNames.SSO) as SSO;
      const res = await ssoComponent.add(context, inputs);
      if (res.isErr()) return err(res.error);
    }

    const biceps: Bicep[] = [];
    // 3.1 bicep.init
    {
      const bicepComponent = Container.get<BicepComponent>("bicep");
      const res = await bicepComponent.init(inputs.projectPath);
      if (res.isErr()) return err(res.error);
    }

    // 3.2 azure-function.generateBicep
    {
      const clonedInputs = cloneDeep(inputs);
      assign(clonedInputs, {
        componentId: ComponentNames.TeamsApi,
        hosting: inputs.hosting,
        scenario: Scenarios.Api,
      });
      const functionComponent = Container.get<AzureFunctionResource>(ComponentNames.Function);
      const res = await functionComponent.generateBicep(context, clonedInputs);
      if (res.isErr()) return err(res.error);
      res.value.forEach((b) => biceps.push(b));
      projectSettings.components.push({
        name: ComponentNames.Function,
        scenario: Scenarios.Api,
        provision: true,
      });
      addedComponents.push(ComponentNames.Function);
    }

    const bicepRes = await bicepUtils.persistBiceps(
      inputs.projectPath,
      convertToAlphanumericOnly(projectSettings.appName),
      biceps
    );
    if (bicepRes.isErr()) return bicepRes;

    // 4. generate config bicep
    {
      const res = await generateConfigBiceps(context, inputs);
      if (res.isErr()) return err(res.error);
      effects.push("generate config biceps");
    }

    // 5. local debug settings
    {
      const res = await generateLocalDebugSettings(context, inputs);
      if (res.isErr()) return err(res.error);
      effects.push("generate local debug configs");
    }

    globalVars.isVS = isVSProject(projectSettings);
    projectSettings.programmingLanguage ||= inputs[CoreQuestionNames.ProgrammingLanguage];
    merge(actionContext?.telemetryProps, {
      [TelemetryProperty.Components]: JSON.stringify(addedComponents),
    });
    addFeatureNotify(inputs, context.userInteraction, "Resource", [AzureResourceFunction.id]);
    return ok(undefined);
  }
  async build(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const apiCode = Container.get<ApiCodeProvider>(ComponentNames.ApiCode);
    const res = await apiCode.build(context, inputs);
    if (res.isErr()) return err(res.error);
    return ok(undefined);
  }
}

const getFunctionNameQuestionValidation = (context: ContextV3, inputs: InputsWithProjectPath) => ({
  validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
    const workingPath: string = path.join(inputs.projectPath, PathConstants.apiWorkingDir);
    const name = input as string;
    if (!name || !RegularExpr.validFunctionNamePattern.test(name)) {
      return ErrorMessage.invalidFunctionName;
    }
    if (inputs.stage === Stage.create) {
      return undefined;
    }
    const language: ProgrammingLanguage =
      (inputs[QuestionKey.programmingLanguage] as ProgrammingLanguage) ??
      (context.projectSetting.programmingLanguage as ProgrammingLanguage);
    // If language is unknown, skip checking and let scaffold handle the error.
    if (language && (await FunctionScaffold.doesFunctionPathExist(workingPath, language, name))) {
      return ErrorMessage.functionAlreadyExists;
    }
  },
});
