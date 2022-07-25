// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  CallAction,
  ContextV3,
  Effect,
  err,
  FunctionAction,
  FxError,
  Inputs,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  QTreeNode,
  Result,
  Stage,
} from "@microsoft/teamsfx-api";
import { assign, cloneDeep } from "lodash";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { isVSProject } from "../../common/projectSettingsHelper";
import { globalVars } from "../../core/globalVars";
import { CoreQuestionNames } from "../../core/question";
import {
  DefaultValues,
  FunctionPluginPathInfo,
  RegularExpr,
} from "../../plugins/resource/function/constants";
import { FunctionLanguage, QuestionKey } from "../../plugins/resource/function/enums";
import { FunctionScaffold } from "../../plugins/resource/function/ops/scaffold";
import { functionNameQuestion } from "../../plugins/resource/function/question";
import { ErrorMessages } from "../../plugins/resource/function/resources/message";
import { ComponentNames, Scenarios } from "../constants";
import { generateConfigBiceps } from "../utils";
import { getComponent, runActionByName } from "../workflow";

@Service(ComponentNames.TeamsApi)
export class TeamsApi {
  name = ComponentNames.TeamsApi;
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    // return ok(this.addApiAction(context, inputs));
    const action: FunctionAction = {
      name: "teams-api.add",
      type: "function",
      question: (context: ContextV3, inputs: InputsWithProjectPath) => {
        functionNameQuestion.validation = getFunctionNameQuestionValidation(context, inputs);
        return ok(new QTreeNode(functionNameQuestion));
      },
      execute: async (context, inputs) => {
        const projectSettings = context.projectSetting;
        const effects: Effect[] = [];
        inputs[CoreQuestionNames.ProgrammingLanguage] =
          context.projectSetting.programmingLanguage ||
          inputs[CoreQuestionNames.ProgrammingLanguage] ||
          "javascript";

        // 1. scaffold function
        {
          inputs[QuestionKey.functionName] =
            inputs[QuestionKey.functionName] || DefaultValues.functionName;
          const clonedInputs = cloneDeep(inputs);
          assign(clonedInputs, {
            folder: inputs.folder || FunctionPluginPathInfo.solutionFolderName,
          });
          const res = await runActionByName("api-code.generate", context, clonedInputs);
          if (res.isErr()) return err(res.error);
          effects.push("generate api code");
        }

        const apiConfig = getComponent(projectSettings, ComponentNames.TeamsApi);
        if (apiConfig) {
          apiConfig.functionNames = apiConfig.functionNames || [];
          apiConfig.functionNames.push(inputs[QuestionKey.functionName]);
          return ok(effects);
        }

        // 2. config teams-api
        projectSettings.components.push({
          name: ComponentNames.TeamsApi,
          hosting: ComponentNames.Function,
          functionNames: [inputs[QuestionKey.functionName]],
          deploy: true,
          build: true,
          folder: inputs.folder || FunctionPluginPathInfo.solutionFolderName,
          artifactFolder: inputs.folder || FunctionPluginPathInfo.solutionFolderName,
        });
        effects.push("config teams-api");

        // 3.1 bicep.init
        {
          const res = await runActionByName("bicep.init", context, inputs);
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
          const res = await runActionByName(
            ComponentNames.Function + ".generateBicep",
            context,
            clonedInputs
          );
          if (res.isErr()) return err(res.error);
          context.projectSetting.components.push({
            name: ComponentNames.Function,
            scenario: Scenarios.Api,
          });
        }

        // 4. generate config bicep
        {
          const res = await generateConfigBiceps(context, inputs);
          if (res.isErr()) return err(res.error);
          effects.push("generate config biceps");
        }

        // 5. local debug settings
        {
          const res = await runActionByName("debug.generateLocalDebugSettings", context, inputs);
          if (res.isErr()) return err(res.error);
          effects.push("generate local debug configs");
        }

        globalVars.isVS = isVSProject(projectSettings);
        projectSettings.programmingLanguage ||= inputs[CoreQuestionNames.ProgrammingLanguage];

        return ok([]);
      },
    };
    return ok(action);
  }
  build(): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(this.buildApiAction());
  }

  // addApiAction(context: ContextV3, inputs: InputsWithProjectPath): Action {
  //   const actions: Action[] = [];
  //   this.setupCode(actions, context, inputs);
  //   this.setupBicep(actions, context, inputs);
  //   this.setupConfiguration(actions, context);
  //   const group: GroupAction = {
  //     type: "group",
  //     name: `${this.name}.add`,
  //     mode: "sequential",
  //     actions: actions,
  //   };
  //   return group;
  // }
  buildApiAction(): Action {
    const action: CallAction = {
      name: `${this.name}.build`,
      type: "call",
      targetAction: "api-code.build",
      required: true,
    };
    return action;
  }

  // private hasApi(context: ContextV3): boolean {
  //   const api = getComponent(context.projectSetting, ComponentNames.TeamsApi);
  //   return api != undefined; // using != to match both undefined and null
  // }

  // setupConfiguration(actions: Action[], context: ContextV3): Action[] {
  //   if (this.hasApi(context)) {
  //     actions.push(addApiTriggerAction);
  //   } else {
  //     actions.push(configApiAction);
  //   }
  //   return actions;
  // }

  // setupBicep(actions: Action[], context: ContextV3, inputs: InputsWithProjectPath): Action[] {
  //   if (this.hasApi(context)) {
  //     return actions;
  //   }
  //   actions.push(initBicep);
  //   actions.push(generateBicep({ scenario: Scenarios.Api, componentId: this.name }));
  //   actions.push(generateConfigBicep({ scenario: Scenarios.Api, componentId: this.name }));
  //   return actions;
  // }

  // setupCode(actions: Action[], context: ContextV3, inputs: InputsWithProjectPath): Action[] {
  //   actions.push(generateApiCode);
  //   if (!this.hasApi(context)) {
  //     actions.push(initLocalDebug);
  //   }
  //   return actions;
  // }
}

const getFunctionNameQuestionValidation = (context: ContextV3, inputs: InputsWithProjectPath) => ({
  validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
    const workingPath: string = path.join(
      inputs.projectPath,
      FunctionPluginPathInfo.solutionFolderName
    );
    const name = input as string;
    if (!name || !RegularExpr.validFunctionNamePattern.test(name)) {
      return ErrorMessages.invalidFunctionName;
    }
    if (inputs.stage === Stage.create) {
      return undefined;
    }
    const language: FunctionLanguage =
      (inputs[QuestionKey.programmingLanguage] as FunctionLanguage) ??
      (context.projectSetting.programmingLanguage as FunctionLanguage);
    // If language is unknown, skip checking and let scaffold handle the error.
    if (language && (await FunctionScaffold.doesFunctionPathExist(workingPath, language, name))) {
      return ErrorMessages.functionAlreadyExists;
    }
  },
});

// const addApiTriggerAction: Action = {
//   name: "fx.addApiTrigger",
//   type: "function",
//   plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
//     return ok([`add new function to '${ComponentNames.TeamsApi}' in projectSettings`]);
//   },
//   execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
//     const functionName: string =
//       (inputs?.[QuestionKey.functionName] as string) ?? DefaultValues.functionName;
//     const api = getComponent(context.projectSetting, ComponentNames.TeamsApi);
//     api?.functionNames?.push(functionName);
//     return ok([`add new function to '${ComponentNames.TeamsApi}' in projectSettings`]);
//   },
// };

// const configApiAction: Action = {
//   name: "fx.configApi",
//   type: "function",
//   plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
//     return ok([`config '${ComponentNames.TeamsApi}' in projectSettings`]);
//   },
//   execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
//     const functionName: string =
//       (inputs?.[QuestionKey.functionName] as string) ?? DefaultValues.functionName;
//     const projectSettings = context.projectSetting as ProjectSettingsV3;
//     // add teams-api
//     projectSettings.components.push({
//       name: ComponentNames.TeamsApi,
//       hosting: ComponentNames.Function,
//       functionNames: [functionName],
//       deploy: true,
//       build: true,
//       folder: "api",
//     });
//     ensureComponentConnections(projectSettings);
//     projectSettings.programmingLanguage =
//       projectSettings.programmingLanguage || inputs[CoreQuestionNames.ProgrammingLanguage];
//     globalVars.isVS = isVSProject(projectSettings);
//     return ok([`config '${ComponentNames.TeamsApi}' in projectSettings`]);
//   },
// };
// const generateApiCode: Action = {
//   name: "call:api-code.generate",
//   type: "call",
//   required: true,
//   targetAction: "api-code.generate",
//   inputs: {
//     folder: "api",
//   },
//   question: (context: ContextV3, inputs: InputsWithProjectPath) => {
//     functionNameQuestion.validation = getFunctionNameQuestionValidation(context, inputs);
//     return ok(new QTreeNode(functionNameQuestion));
//   },
// };
// const initBicep: Action = {
//   type: "call",
//   targetAction: "bicep.init",
//   required: true,
// };
// const generateBicep: (inputs: Record<string, unknown>) => Action = (inputs) => ({
//   name: `call:azure-function.generateBicep`,
//   type: "call",
//   required: true,
//   targetAction: `azure-function.generateBicep`,
//   inputs: inputs,
//   post: (context) => {
//     // add hosting component
//     context.projectSetting.components.push({
//       name: ComponentNames.Function,
//       connections: [ComponentNames.TeamsApi, ComponentNames.TeamsTab],
//       scenario: Scenarios.Api,
//     });
//     ensureComponentConnections(context.projectSetting);
//     return ok(undefined);
//   },
// });
// const generateConfigBicep: (inputs: Record<string, unknown>) => Action = (inputs) => ({
//   name: `call:azure-function-config.generateBicep`,
//   type: "call",
//   required: true,
//   targetAction: `azure-function-config.generateBicep`,
//   inputs: inputs,
// });
// const initLocalDebug: Action = {
//   name: "call:debug.generateLocalDebugSettings",
//   type: "call",
//   required: true,
//   targetAction: "debug.generateLocalDebugSettings",
// };
