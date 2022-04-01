// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Json, ResourceConfig } from "@microsoft/teamsfx-api";
import * as Handlebars from "handlebars";
import { assign, merge } from "lodash";
import "reflect-metadata";
import { Container } from "typedi";
import { Action, ProjectSettingsV3 } from "./interface";

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

function _templateReplace(schema: Json, context: Json, rootContext: Json) {
  let change = false;
  for (const key of Object.keys(schema)) {
    const subSchema = schema[key];
    let subContext = context[key];
    console.log(`subSchema: ${subSchema}, subContext: ${subContext}`);
    if (typeof subSchema === "string") {
      const template = Handlebars.compile(subSchema);
      const newValue = template(rootContext);
      if (newValue !== subSchema) {
        change = true;
      }
      schema[key] = newValue;
      context[key] = newValue;
    } else if (typeof subSchema === "object") {
      if (!subContext) {
        subContext = {};
        assign(subContext, subSchema);
        context[key] = subContext;
      } else {
        merge(subContext, subSchema);
      }
      const valueIsChange = _templateReplace(subSchema, subContext, rootContext);
      if (valueIsChange) change = true;
    }
  }
  return change;
}
const schema = {
  a: "{{b.input}}",
  b: {
    input: "{{c.input}}",
  },
  c: { input: "d.input" },
};
const context = {
  d: { input: "abc" },
};
_templateReplace(schema, context, context);
console.log(schema);

function templateReplace(schema: Json, params: Json) {
  let change;
  do {
    change = _templateReplace(schema, params, params);
  } while (change);
}

export async function resolveAction(action: Action, context: any, inputs: any): Promise<Action> {
  if (action.type === "call") {
    if (action.inputs) {
      templateReplace(action.inputs, inputs);
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
      templateReplace(action.inputs, inputs);
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
    console.log(`---- plan[${inputs.step++}]: shell command: ${action.command}`);
  } else if (action.type === "call") {
    // if (action.inputs) {
    //   templateReplace(action.inputs, inputs);
    // }
    const targetAction = await getAction(action.targetAction, context, inputs);
    if (action.required && !targetAction) {
      throw new Error("targetAction not exist: " + action.targetAction);
    }
    if (targetAction) {
      await planAction(targetAction, context, inputs);
    }
  } else {
    // if (action.inputs) {
    //   templateReplace(action.inputs, inputs);
    // }
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
      templateReplace(action.inputs, inputs);
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
      templateReplace(action.inputs, inputs);
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
