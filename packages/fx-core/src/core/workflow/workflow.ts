// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Json, ResourceConfig } from "@microsoft/teamsfx-api";
import * as Handlebars from "handlebars";
import "reflect-metadata";
import { Container } from "typedi";
import { Action, ProjectSettingsV3 } from "./interface";
import toposort from "toposort";
import { merge } from "lodash";

export async function getAction(
  name: string,
  context: any,
  inputs: any
): Promise<Action | undefined> {
  const arr = name.split(".");
  const resourceName = arr[0];
  const actionName = arr[1];
  if (!resourceName) throw new Error(`invalid action name: ${name}`);
  const resource = Container.get(resourceName) as any;
  if (resource[actionName]) {
    const res = await resource[actionName](context, inputs);
    if (res.isOk()) {
      const action = res.value;
      return action;
    }
  }
  return undefined;
}

function _resolveVariables(schema: Json) {
  const variables = new Set<string>();
  extractVariables(schema, variables);
  const graph: Array<[string, string | undefined]> = [];
  for (const variable of variables) {
    const variableValue = getValueByPath(schema, variable);
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
    const variableValue = getValueByPath(schema, variable);
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
// const schema = {
//   a: { input: { value: "{{b.output.value}}" } },
//   b: { output: { value: "{{c}}" } },
//   d: { value: "{{f}}" },
//   g: { output: { input: "{{b.output.value}}-{{d.value}}" } },
//   f: "{{e}}",
//   e: "1",
//   c: "2",
// };
// resolveVariables(schema);
// console.log(JSON.stringify(schema, undefined, 4));

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

function getValueByPath(obj: Json, path: string): any {
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
    const planRes = await action.plan(context, inputs);
    if (planRes.isOk()) {
      for (const plan of planRes.value) {
        console.log(`---- plan [${inputs.step}]: [${action.name}] - ${plan}`);
      }
      inputs.step++;
    }
  } else if (action.type === "shell") {
    console.log(`---- plan[${inputs.step++}]: shell command: ${action.description}`);
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

export async function executeAction(action: Action, context: any, inputs: any): Promise<void> {
  if (!inputs.step) inputs.step = 1;
  if (action.type === "function") {
    console.log(`##### execute [${inputs.step++}]: [${action.name}]`);
    await action.execute(context, inputs);
  } else if (action.type === "shell") {
    console.log(`##### shell [${inputs.step++}]: ${action.command}`);
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

export function getResource(
  projectSettings: ProjectSettingsV3,
  resourceType: string
): ResourceConfig | undefined {
  if (!projectSettings.resources) return undefined;
  const results = projectSettings.resources.filter((r) => r.name === resourceType);
  return results[0];
}
