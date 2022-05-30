// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
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
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";

export async function getAction(
  name: string,
  context: ContextV3,
  inputs: InputsWithProjectPath
): Promise<Action | undefined> {
  const arr = name.split(".");
  const resourceName = arr[0];
  const actionName = arr[1];
  if (!resourceName) throw new Error(`invalid action name: ${name}`);
  try {
    const resource = Container.get(resourceName) as any;
    if (resource[actionName]) {
      const res = await resource[actionName](context, inputs);
      if (res.isOk()) {
        const action = res.value;
        return action;
      }
    }
  } catch (e) {}
  return undefined;
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
    const targetAction = await getAction(action.targetAction, context, inputs);
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
    const targetAction = await getAction(action.targetAction, context, inputs);
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

export class ActionNotExist extends SystemError {
  constructor(action: string) {
    super({
      source: "fx",
      message: getDefaultString("error.ActionNotExist", action),
      displayMessage: getLocalizedString("error.ActionNotExist", action),
    });
  }
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
      plans = plans.concat(persistBicepPlans(inputs.projectPath, effect));
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
      plans = plans.concat(persistBicepPlans(inputs.projectPath, effect));
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
    const targetAction = await getAction(action.targetAction, context, inputs);
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
  if (action.type === "function") {
    return await executeFunctionAction(action, context, inputs, effects);
  } else if (action.type === "shell") {
    effects.push(`shell executed: ${action.command}`);
  } else if (action.type === "call") {
    if (action.inputs) {
      resolveVariables(inputs, action.inputs);
    }
    const targetAction = await getAction(action.targetAction, context, inputs);
    if (action.required && !targetAction) {
      return err(new ActionNotExist(action.targetAction));
    }
    if (targetAction) {
      await executeAction(targetAction, context, inputs, effects);
    }
  } else {
    if (action.inputs) {
      resolveVariables(inputs, action.inputs);
    }
    if (action.mode === "parallel") {
      const promises = action.actions.map((a) => executeAction(a, context, inputs, effects));
      const results = await Promise.all(promises);
      for (const result of results) {
        if (result.isErr()) return err(result.error);
      }
    } else {
      for (const act of action.actions) {
        const res = await executeAction(act, context, inputs, effects);
        if (res.isErr()) return err(res.error);
      }
    }
  }
  return ok(undefined);
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
  // validate inputs
  if (action.question) {
    const getQuestionRes = await action.question(context, inputs);
    if (getQuestionRes.isErr()) return err(getQuestionRes.error);
    const node = getQuestionRes.value;
    if (node) {
      const validationRes = await traverse(
        node,
        inputs,
        context.userInteraction,
        context.telemetryReporter,
        validateQuestion
      );
      if (validationRes.isErr()) err(validationRes.error);
    }
  }
  const res = await action.execute(context, inputs);
  if (res.isErr()) return err(res.error);
  if (res.value) {
    //persist bicep files for bicep effects
    for (const effect of res.value) {
      if (typeof effect !== "string" && effect.type === "bicep") {
        const bicep = effect as Bicep;
        if (bicep) {
          const bicepPlans = persistBicepPlans(inputs.projectPath, bicep);
          bicepPlans.forEach((p) => effects.push(p));
          await persistBicep(inputs.projectPath, bicep);
        }
      } else {
        effects.push(effect);
      }
    }
  }
  context.logProvider.info(`##### executed [${action.name}]`);
  return ok(undefined);
}

export function getComponent(
  projectSettings: ProjectSettingsV3,
  resourceType: string
): Component | undefined {
  if (!projectSettings.components) return undefined;
  const results = projectSettings.components.filter((r) => r.name === resourceType);
  return results[0];
}

export async function runAction(
  actionName: string,
  context: ContextV3,
  inputs: InputsWithProjectPath
): Promise<Result<undefined, FxError>> {
  context.logProvider.info(
    `------------------------run action: ${actionName} start!------------------------`
  );
  const action = await getAction(actionName, context, inputs);
  if (action) {
    const questionRes = await askQuestionForAction(action, context, inputs);
    if (questionRes.isErr()) return err(questionRes.error);
    const planEffects: Effect[] = [];
    await planAction(action, context, cloneDeep(inputs), planEffects);
    const confirm = await showPlanAndConfirm(
      `action: ${actionName} will do the following changes:`,
      planEffects,
      context,
      inputs
    );
    if (confirm) {
      const execEffects: Effect[] = [];
      const execRes = await executeAction(action, context, inputs, execEffects);
      if (execRes.isErr()) return execRes;
      await showSummary(`${actionName} summary:`, execEffects, context, inputs);
    }
  }
  context.logProvider.info(
    `------------------------run action: ${actionName} finish!------------------------`
  );
  return ok(undefined);
}
