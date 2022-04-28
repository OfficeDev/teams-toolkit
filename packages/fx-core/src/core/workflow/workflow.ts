// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FxError,
  getValidationFunction,
  InputResult,
  Inputs,
  Json,
  ok,
  Question,
  Result,
  traverse,
  UserError,
  UserInteraction,
} from "@microsoft/teamsfx-api";
import * as Handlebars from "handlebars";
import "reflect-metadata";
import { Container } from "typedi";
import { Action, Component, FunctionAction, ProjectSettingsV3 } from "./interface";
import toposort from "toposort";
import { merge } from "lodash";
import { MockUserInteraction } from "./utils";
import { Bicep } from "../../common/constants";
import { persistBicep, persistBicepPlans } from "./bicepUtils";

export async function getAction(
  name: string,
  context: any,
  inputs: any
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

export async function resolveAction(action: Action, context: any, inputs: any): Promise<Action> {
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

export async function planAction(action: Action, context: any, inputs: any): Promise<void> {
  if (!inputs.step) inputs.step = 1;
  if (action.type === "function") {
    let plans: string[] = [];
    if (action.name.endsWith(".generateBicep")) {
      const res = await action.execute(context, inputs);
      if (res.isOk()) {
        const bicep = res.value as Bicep | undefined;
        if (bicep) {
          plans = await persistBicepPlans(inputs.projectPath, bicep);
        }
      } else {
        throw res.error;
      }
    } else {
      const planRes = await action.plan(context, inputs);
      if (planRes.isOk()) {
        plans = planRes.value;
      }
    }
    let subStep = 1;
    for (const plan of plans) {
      console.log(`---- plan [${inputs.step}.${subStep++}]: [${action.name}] - ${plan}`);
    }
    inputs.step++;
  } else if (action.type === "shell") {
    console.log(`---- plan [${inputs.step++}]: shell command: ${action.description}`);
  } else if (action.type === "call") {
    if (action.inputs) {
      resolveVariables(inputs, action.inputs);
    }
    const targetAction = await getAction(action.targetAction, context, inputs);
    if (action.required && !targetAction) {
      throw new Error("targetAction not exist: " + action.targetAction);
    }
    if (targetAction) {
      await planAction(targetAction, context, inputs);
    }
  } else {
    if (action.inputs) {
      resolveVariables(inputs, action.inputs);
    }
    for (const act of action.actions) {
      await planAction(act, context, inputs);
    }
  }
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
  if (validationFunc) {
    const answer = getEmbeddedValueByPath(inputs, question.name);
    if (!answer) return err(new ValidationError(`question ${question.name} has no answer!`));
    let res = await validationFunc(answer);
    if (res) {
      res = `${question.name}: ${res}`;
      return err(new ValidationError(res));
    }
  }
  return ok({ type: "success" });
}

/** 
 * test case for validation
const textNode = new QTreeNode({
  type: "text",
  name: "fx.app-name",
  title: "app name",
  validation: { maxLength: 10 },
});

const multiSelectNode = new QTreeNode({
  type: "multiSelect",
  name: "fx.resources",
  staticOptions: ["sql", "function", "apim", "keyvalut"],
  title: "select resources",
  validation: { enum: ["sql", "function", "apim", "keyvalut"] },
});

const groupNode = new QTreeNode({ type: "group" });
groupNode.addChild(textNode);
groupNode.addChild(multiSelectNode);

const inputs: Inputs = {
  platform: Platform.VSCode,
  fx: {
    "app-name": "123456",
    resources: ["sql1"],
  },
};
traverse(groupNode, inputs, new MockUserInteraction(), undefined, validateQuestion).then((res) =>
  console.log(res)
);
*/

export async function executeFunctionAction(
  action: FunctionAction,
  context: any,
  inputs: any
): Promise<void> {
  if (action.question) {
    const getQuestionRes = await action.question(context, inputs);
    if (getQuestionRes.isErr()) throw new Error(`get question error: ${action.name}`);
    const node = getQuestionRes.value;
    if (node) {
      const validationRes = await traverse(
        node,
        inputs,
        new MockUserInteraction(),
        undefined,
        validateQuestion
      );
      if (validationRes.isErr()) throw validationRes.error;
    }
  }
  const res = await action.execute(context, inputs);
  if (res.isOk()) {
    //persist bicep files for 'generateBicep' method
    if (action.name.endsWith(".generateBicep")) {
      const bicep = res.value as Bicep | undefined;
      if (bicep) {
        await persistBicep(inputs.projectPath, bicep);
      }
    }
  } else {
    throw res.error;
  }
  console.log(`##### executed [${inputs.step++}]: [${action.name}]`);
}

export async function executeAction(action: Action, context: any, inputs: any): Promise<void> {
  if (!inputs.step) inputs.step = 1;
  if (action.type === "function") {
    await executeFunctionAction(action, context, inputs);
  } else if (action.type === "shell") {
    console.log(`##### shell executed [${inputs.step++}]: ${action.command}`);
  } else if (action.type === "call") {
    if (action.inputs) {
      resolveVariables(inputs, action.inputs);
    }
    const targetAction = await getAction(action.targetAction, context, inputs);
    if (action.required && !targetAction) {
      throw new Error("action not exist: " + action.targetAction);
    }
    if (targetAction) {
      await executeAction(targetAction, context, inputs);
    }
  } else {
    if (action.inputs) {
      resolveVariables(inputs, action.inputs);
    }
    for (const act of action.actions) {
      await executeAction(act, context, inputs);
    }
  }
}

export function getComponent(
  projectSettings: ProjectSettingsV3,
  resourceType: string
): Component | undefined {
  if (!projectSettings.components) return undefined;
  const results = projectSettings.components.filter((r) => r.name === resourceType);
  return results[0];
}
