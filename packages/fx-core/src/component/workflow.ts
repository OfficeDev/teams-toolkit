// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  assembleError,
  Bicep,
  Component,
  ContextV3,
  Effect,
  err,
  FunctionAction,
  FxError,
  getValidationFunction,
  InputResult,
  Inputs,
  InputsWithProjectPath,
  Json,
  ok,
  ProjectSettingsV3,
  Question,
  Result,
  SystemError,
  traverse,
  UserError,
  UserInteraction,
} from "@microsoft/teamsfx-api";
import * as Handlebars from "handlebars";
import "reflect-metadata";
import { Container } from "typedi";
import toposort from "toposort";
import { cloneDeep, merge } from "lodash";
import {
  fileEffectPlanStrings,
  persistBicep,
  persistBicepPlans,
  serviceEffectPlanString,
} from "./utils";
import { convertToAlphanumericOnly } from "../common/utils";
import { ActionNotExist, ComponentNotExist } from "./error";
import { globalVars } from "../core";
import { TelemetryConstants, Scenarios } from "./constants";

export async function getAction(
  name: string,
  context: ContextV3,
  inputs: InputsWithProjectPath,
  required: boolean
): Promise<Action | undefined> {
  const arr = name.split(".");
  if (arr.length !== 2) {
    throw new ActionNotExist(name);
  }
  const componentName = arr[0];
  const actionName = arr[1];
  let component;
  try {
    component = Container.get(componentName) as any;
  } catch (e) {
    if (required) throw new ComponentNotExist(componentName);
    else return undefined;
  }
  if (!component[actionName]) {
    if (required) throw new ActionNotExist(name);
    else return undefined;
  }
  try {
    const res = await component[actionName](context, inputs);
    if (res.isOk()) {
      const action = res.value;
      return action;
    } else {
      throw res.error;
    }
  } catch (e) {
    throw assembleError(e);
  }
}

function _resolveVariables(schema: Json) {
  const variables = new Set<string>();
  extractVariables(schema, variables);
  const graph: Array<[string, string | undefined]> = [];
  for (const variable of variables) {
    const variableValue = getEmbeddedValueByPath(schema, variable);
    const dependentVariables = extractVariablesInString(variableValue); // variables's dependent variables
    if (dependentVariables.size > 0) {
      for (const dependency of dependentVariables) {
        graph.push([variable, dependency]);
      }
    }
  }
  const list = toposort(graph).reverse();
  for (let i = 1; i < list.length; ++i) {
    const variable = list[i];
    const variableValue = getEmbeddedValueByPath(schema, variable);
    const replacedValue = _replaceVariables(variableValue, schema);
    setValueByPath(schema, variable, replacedValue);
  }
  _replaceVariables(schema, schema);
}

function _replaceVariables(schema: any, context: Json) {
  if (typeof schema === "string") {
    const schemaStr = schema as string;
    if (schemaStr.includes("{{") && schemaStr.includes("}}")) {
      const template = Handlebars.compile(schema);
      const newValue = template(context);
      return newValue;
    }
    return schemaStr;
  } else if (typeof schema === "object") {
    for (const key of Object.keys(schema)) {
      const subSchema = schema[key];
      schema[key] = _replaceVariables(subSchema, context);
    }
    return schema;
  } else {
    return schema;
  }
}

function extractVariables(obj: any, set: Set<string>) {
  if (!obj) return;
  if (typeof obj === "string") {
    const subSet = extractVariablesInString(obj as string);
    subSet.forEach((v) => set.add(v));
  } else if (typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      const value = obj[key] as any;
      extractVariables(value, set);
    }
  }
}
function extractVariablesInString(schema: string): Set<string> {
  if (!schema) return new Set<string>();
  let end = 0;
  let start = schema.indexOf("{{");
  let name;
  const set = new Set<string>();
  while (start >= 0) {
    end = schema.indexOf("}}", start + 2);
    name = schema.substring(start + 2, end).trim();
    if (name) {
      set.add(name);
    }
    start = schema.indexOf("{{", end + 2);
  }
  return set;
}

export function getEmbeddedValueByPath(obj: Json, path: string): any {
  const array = path.split(".");
  let subObj = obj;
  for (let i = 0; i < array.length; ++i) {
    const key = array[i];
    subObj = subObj[key];
    if (!subObj) return undefined;
    if (i < array.length - 1 && typeof subObj !== "object") return undefined;
  }
  return subObj;
}

function setValueByPath(obj: Json, path: string, value: any) {
  const array = path.split(".");
  const mergeObj: any = {};
  let subObj = mergeObj;
  for (let i = 0; i < array.length - 1; ++i) {
    const key = array[i];
    subObj[key] = {};
    subObj = subObj[key];
  }
  subObj[array[array.length - 1]] = value;
  merge(obj, mergeObj);
}

function resolveVariables(params: Json, schema: Json) {
  merge(params, schema);
  _resolveVariables(params);
}

export async function resolveAction(
  action: Action,
  context: ContextV3,
  inputs: InputsWithProjectPath
): Promise<Action> {
  if (action.type === "call") {
    if (action.inputs) {
      resolveVariables(inputs, action.inputs);
    }
    const targetAction = await getAction(action.targetAction, context, inputs, action.required);
    if (targetAction) {
      if (targetAction.type !== "function") {
        const resolvedAction = await resolveAction(targetAction, context, inputs);
        if (action.inputs) {
          (resolvedAction as any)["inputs"] = action.inputs;
        }
        return resolvedAction;
      }
    }
    return action;
  } else if (action.type === "group") {
    if (action.inputs) {
      resolveVariables(inputs, action.inputs);
    }
    for (let i = 0; i < action.actions.length; ++i) {
      action.actions[i] = await resolveAction(action.actions[i], context, inputs);
    }
  }
  return action;
}

export async function askQuestionForAction(
  action: Action,
  context: ContextV3,
  inputs: InputsWithProjectPath
): Promise<Result<undefined, FxError>> {
  if (action.type === "function") {
    // ask question before plan
    if (action.question) {
      const getQuestionRes = await action.question(context, inputs);
      if (getQuestionRes.isErr()) return err(getQuestionRes.error);
      const node = getQuestionRes.value;
      if (node) {
        const questionRes = await traverse(
          node,
          inputs,
          context.userInteraction,
          context.telemetryReporter
        );
        if (questionRes.isErr()) return err(questionRes.error);
      }
    }
  } else if (action.type === "shell") {
    //TODO
    context.logProvider.info(`---- plan [${inputs.step++}]: shell command: ${action.description}`);
  } else if (action.type === "call") {
    if (action.inputs) {
      resolveVariables(inputs, action.inputs);
    }
    const targetAction = await getAction(action.targetAction, context, inputs, action.required);
    if (action.required && !targetAction) {
      return err(new ActionNotExist(action.targetAction));
    }
    if (targetAction) {
      return await askQuestionForAction(targetAction, context, inputs);
    }
  } else {
    if (action.inputs) {
      resolveVariables(inputs, action.inputs);
    }
    for (const act of action.actions) {
      const res = await askQuestionForAction(act, context, inputs);
      if (res.isErr()) return err(res.error);
    }
  }
  return ok(undefined);
}

export async function showPlanAndConfirm(
  title: string,
  effects: Effect[],
  context: ContextV3,
  inputs: InputsWithProjectPath
) {
  let plans: string[] = [];
  for (const effect of effects) {
    if (typeof effect === "string") {
      plans.push(effect);
    } else if (effect.type === "file") {
      plans = plans.concat(fileEffectPlanStrings(effect));
    } else if (effect.type === "service") {
      plans.push(serviceEffectPlanString(effect));
    } else if (effect.type === "bicep") {
      plans = plans.concat(await persistBicepPlans(inputs.projectPath, effect));
    } else if (effect.type === "shell") {
      plans.push(`shell command: ${effect.description}`);
    }
  }
  for (let i = 0; i < plans.length; ++i) {
    plans[i] = `step ${i + 1} - ${plans[i]}`;
  }
  const res = await context.userInteraction.showMessage(
    "info",
    title + "\n" + plans.join("\n"),
    true,
    "Confirm"
  );
  if (res.isOk() && res.value === "Confirm") {
    return true;
  }
  return false;
}

export async function showSummary(
  title: string,
  effects: Effect[],
  context: ContextV3,
  inputs: InputsWithProjectPath
) {
  let plans: string[] = [];
  for (const effect of effects) {
    if (typeof effect === "string") {
      plans.push(effect);
    } else if (effect.type === "file") {
      plans = plans.concat(fileEffectPlanStrings(effect));
    } else if (effect.type === "service") {
      plans.push(serviceEffectPlanString(effect));
    } else if (effect.type === "bicep") {
      plans = plans.concat(await persistBicepPlans(inputs.projectPath, effect));
    } else if (effect.type === "shell") {
      plans.push(`shell command: ${effect.description}`);
    }
  }
  context.logProvider.info(title);
  plans.forEach((p) => context.logProvider.info(p));
}

export async function planAction(
  action: Action,
  context: ContextV3,
  inputs: InputsWithProjectPath,
  effects: Effect[]
): Promise<Result<undefined, FxError>> {
  if (action.type === "function") {
    if (action.plan) {
      const planRes = await action.plan(context, inputs);
      if (planRes.isErr()) return err(planRes.error);
      planRes.value.forEach((e) => effects.push(e));
    }
  } else if (action.type === "shell") {
    effects.push(action);
  } else if (action.type === "call") {
    if (action.inputs) {
      resolveVariables(inputs, action.inputs);
    }
    const targetAction = await getAction(action.targetAction, context, inputs, action.required);
    if (action.required && !targetAction) {
      return err(new ActionNotExist(action.targetAction));
    }
    if (targetAction) {
      await planAction(targetAction, context, inputs, effects);
    }
  } else {
    if (action.inputs) {
      resolveVariables(inputs, action.inputs);
    }
    for (const act of action.actions) {
      const res = await planAction(act, context, inputs, effects);
      if (res.isErr()) return err(res.error);
    }
  }
  return ok(undefined);
}

export async function executeAction(
  action: Action,
  context: ContextV3,
  inputs: InputsWithProjectPath,
  effects: Effect[]
): Promise<Result<undefined, FxError>> {
  console.log(`executeAction: ${action.name}`);
  if (action.pre) {
    const res = await action.pre(context, inputs);
    if (res.isErr()) return err(res.error);
  }
  let res: Result<undefined, FxError>;
  if (action.type === "function") {
    res = await executeFunctionAction(action, context, inputs, effects);
  } else if (action.type === "shell") {
    effects.push(`shell executed: ${action.command}`);
    res = ok(undefined);
  } else if (action.type === "call") {
    const clonedInputs = cloneDeep(inputs);
    if (action.inputs) {
      resolveVariables(clonedInputs, action.inputs);
    }
    const targetAction = await getAction(
      action.targetAction,
      context,
      clonedInputs,
      action.required
    );
    if (action.required && !targetAction) {
      return err(new ActionNotExist(action.targetAction));
    }
    if (targetAction) {
      res = await executeAction(targetAction, context, clonedInputs, effects);
    } else {
      res = ok(undefined);
    }
  } else {
    const clonedInputs = cloneDeep(inputs);
    if (action.inputs) {
      resolveVariables(clonedInputs, action.inputs);
    }
    if (action.mode === "parallel") {
      const promises = action.actions.map((a) => {
        const subInputs = cloneDeep(clonedInputs);
        return executeAction(a, context, subInputs, effects);
      });
      const results = await Promise.all(promises);
      for (const result of results) {
        if (result.isErr()) return err(result.error);
      }
    } else {
      for (const act of action.actions) {
        const subInputs = cloneDeep(clonedInputs);
        const res = await executeAction(act, context, subInputs, effects);
        if (res.isErr()) return err(res.error);
      }
    }
    res = ok(undefined);
  }
  if (action.post) {
    const res = await action.post(context, inputs);
    if (res.isErr()) return err(res.error);
  }
  return res;
}

export class ValidationError extends UserError {
  constructor(msg: string) {
    super({ message: msg, displayMessage: msg, source: "core" });
  }
}

export async function validateQuestion(
  question: Question,
  ui: UserInteraction,
  inputs: Inputs,
  step?: number,
  totalSteps?: number
): Promise<Result<InputResult<any>, FxError>> {
  const validationFunc = (question as any).validation
    ? getValidationFunction<string>((question as any).validation, inputs)
    : undefined;
  const answer = getEmbeddedValueByPath(inputs, question.name);
  if (validationFunc) {
    if (!answer) return err(new ValidationError(`question ${question.name} has no answer!`));
    let res = await validationFunc(answer);
    if (res) {
      res = `${question.name}: ${res}`;
      return err(new ValidationError(res));
    }
  }
  return ok({ type: "success", result: answer });
}

export async function executeFunctionAction(
  action: FunctionAction,
  context: ContextV3,
  inputs: InputsWithProjectPath,
  effects: Effect[]
): Promise<Result<undefined, FxError>> {
  context.logProvider.info(`executeFunctionAction [${action.name}] start!`);
  const arr = action.name.split(".");
  const eventName = action.telemetryEventName || arr[1];
  const componentName = action.telemetryComponentName || arr[0];
  const telemetryProps = {
    [TelemetryConstants.properties.component]: componentName,
    [TelemetryConstants.properties.appId]: globalVars.teamsAppId,
    [TelemetryConstants.properties.tenantId]: globalVars.m365TenantId,
  };
  let progressBar;
  try {
    // send start telemetry
    if (action.enableTelemetry) {
      const startEvent = eventName + "-start";
      context.telemetryReporter.sendTelemetryEvent(startEvent, telemetryProps);
    }
    // validate inputs
    if (action.question) {
      const getQuestionRes = await action.question(context, inputs);
      if (getQuestionRes.isErr()) throw getQuestionRes.error;
      const node = getQuestionRes.value;
      if (node) {
        const validationRes = await traverse(
          node,
          inputs,
          context.userInteraction,
          context.telemetryReporter,
          validateQuestion
        );
        if (validationRes.isErr()) throw validationRes.error;
      }
    }
    // progress bar
    if (action.enableProgressBar) {
      progressBar = context.userInteraction.createProgressBar(
        action.progressTitle || action.name,
        action.progressSteps || 1
      );
      progressBar.start();
    }
    const res = await action.execute(
      context,
      inputs,
      progressBar,
      action.enableTelemetry ? telemetryProps : undefined
    );
    if (res.isErr()) throw res.error;
    if (res.value) {
      //persist bicep files for bicep effects
      for (const effect of res.value) {
        if (typeof effect !== "string" && effect.type === "bicep") {
          const bicep = effect as Bicep;
          if (bicep) {
            const bicepPlans = await persistBicepPlans(inputs.projectPath, bicep);
            bicepPlans.forEach((p) => effects.push(p));
            // TODO: handle the returned error of bicep generation
            const bicepRes = await persistBicep(
              inputs.projectPath,
              convertToAlphanumericOnly(context.projectSetting.appName),
              bicep
            );
            if (bicepRes.isErr()) throw bicepRes.error;
          }
        } else {
          effects.push(effect);
        }
      }
    }
    // send end telemetry
    if (action.enableTelemetry) {
      context.telemetryReporter.sendTelemetryEvent(eventName, {
        ...telemetryProps,
        [TelemetryConstants.properties.success]: TelemetryConstants.values.yes,
      });
    }
    progressBar?.end(true);
    context.logProvider.info(`executeFunctionAction [${action.name}] finish!`);
    return ok(undefined);
  } catch (e) {
    let fxError;
    if (action.errorHandler) {
      fxError = action.errorHandler(e);
    } else {
      fxError = assembleError(e);
      if (fxError.source === "unknown") {
        fxError.source = action.errorSource || fxError.source;
      }
      if (fxError instanceof UserError) {
        fxError.helpLink = fxError.helpLink || action.errorHelpLink;
      }
      if (fxError instanceof SystemError) {
        fxError.issueLink = fxError.issueLink || action.errorIssueLink;
      }
    }
    // send error telemetry
    if (action.enableTelemetry) {
      const errorCode = fxError.source + "." + fxError.name;
      const errorType =
        fxError instanceof SystemError
          ? TelemetryConstants.values.systemError
          : TelemetryConstants.values.userError;
      context.telemetryReporter.sendTelemetryEvent(eventName, {
        ...telemetryProps,
        [TelemetryConstants.properties.success]: TelemetryConstants.values.no,
        [TelemetryConstants.properties.errorCode]: errorCode,
        [TelemetryConstants.properties.errorType]: errorType,
        [TelemetryConstants.properties.errorMessage]: fxError.message,
      });
    }
    progressBar?.end(false);
    return err(fxError);
  }
}

export function getComponent(
  projectSettings: ProjectSettingsV3,
  resourceType: string
): Component | undefined {
  return projectSettings.components?.find((r) => r.name === resourceType);
}

export function getComponentByScenario(
  projectSetting: ProjectSettingsV3,
  resourceType: string,
  scenario?: Scenarios
): Component | undefined {
  return scenario
    ? projectSetting.components?.find((r) => r.name === resourceType && r.scenario === scenario)
    : getComponent(projectSetting, resourceType);
}

export function getHostingParentComponent(
  projectSettings: ProjectSettingsV3,
  resourceType: string,
  scenario?: Scenarios
): Component | undefined {
  const hostingComponent = getComponentByScenario(projectSettings, resourceType, scenario);
  const parentName = hostingComponent?.connections?.find((name) => {
    const component = getComponent(projectSettings, name);
    return component?.hosting === hostingComponent.name;
  });
  if (!parentName) {
    return undefined;
  }
  const parent = getComponent(projectSettings, parentName);
  return parent;
}

export async function runAction(
  actionName: string,
  context: ContextV3,
  inputs: InputsWithProjectPath
): Promise<Result<undefined, FxError>> {
  context.logProvider.info(
    `------------------------run action: ${actionName} start!------------------------`
  );
  try {
    const action = await getAction(actionName, context, inputs, true);
    if (action) {
      const questionRes = await askQuestionForAction(action, context, inputs);
      if (questionRes.isErr()) return err(questionRes.error);
      const planEffects: Effect[] = [];
      await planAction(action, context, cloneDeep(inputs), planEffects);
      // const confirm = await showPlanAndConfirm(
      //   `action: ${actionName} will do the following changes:`,
      //   planEffects,
      //   context,
      //   inputs
      // );
      // if (confirm) {
      const execEffects: Effect[] = [];
      const execRes = await executeAction(action, context, inputs, execEffects);
      if (execRes.isErr()) return execRes;
      await showSummary(`${actionName} summary:`, execEffects, context, inputs);
      // }
    } else {
      return err(
        new SystemError({
          source: "fx",
          name: "ActionNotFoundError",
          message: "action not found:" + actionName,
        })
      );
    }
  } catch (e) {
    return err(assembleError(e));
  }
  context.logProvider.info(
    `------------------------run action: ${actionName} finish!------------------------`
  );
  return ok(undefined);
}
