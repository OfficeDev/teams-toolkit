// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Json, Platform, ProjectSettings, v2 } from "@microsoft/teamsfx-api";
import * as Handlebars from "handlebars";
import { assign, merge } from "lodash";
import "reflect-metadata";
import { Container } from "typedi";
import { createV2Context } from "../../common";
import { setTools } from "../globalVars";
import "./aad";
import "./azureBot";
import "./azureFunction";
import "./azureStorage";
import "./azureWebApp";
import "./core";
import { Action } from "./interface";
import "./teamsBot";
import "./teamsManifest";
import { MockTools } from "./utils";

async function getAction(name: string, context: any, inputs: any) {
  const arr = name.split(".");
  const resourceName = arr[0];
  const actionName = arr[1];
  const resource = Container.get(resourceName) as any;
  if (resource[actionName]) {
    const res = await resource[actionName](context, inputs);
    if (res.isOk()) return res.value;
  }
  return undefined;
}

function _templateReplace(schema: Json, context: Json, rootContext: Json) {
  let change = false;
  for (const key of Object.keys(schema)) {
    const subSchema = schema[key];
    if (typeof subSchema === "string") {
      const template = Handlebars.compile(subSchema);
      const newValue = template(rootContext);
      if (newValue !== subSchema) {
        change = true;
      }
      schema[key] = newValue;
      context[key] = newValue;
    } else if (typeof subSchema === "object") {
      let subContext = context[key];
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

function templateReplace(schema: Json, params: Json) {
  let change;
  do {
    change = _templateReplace(schema, params, params);
  } while (change);
}

async function resolveAction(context: any, inputs: any, action: Action): Promise<Action> {
  if (action.type === "call") {
    const targetAction = await getAction(action.targetAction, context, inputs);
    return await resolveAction(context, inputs, targetAction);
  } else if (action.type === "group") {
    for (let i = 0; i < action.actions.length; ++i) {
      action.actions[i] = await resolveAction(context, inputs, action.actions[i]);
    }
  }
  return action;
}

async function planAction(context: any, inputs: any, action: Action) {
  if (action.type === "function") {
    const planRes = await action.plan(context, inputs);
    if (planRes.isOk()) {
      console.log(`---- plan: ${action.name} - ${planRes.value}`);
    }
  } else if (action.type === "shell") {
    console.log("---- plan: shell " + action.command);
  } else if (action.type === "call") {
    const targetAction = await getAction(action.targetAction, context, inputs);
    if (action.required && !targetAction) {
      throw new Error("targetAction not exist: " + action.targetAction);
    }
    if (targetAction) {
      if (action.inputs) {
        merge(inputs, action.inputs);
      }
      await planAction(context, inputs, targetAction);
    }
  } else {
    if (!action.actions) {
      console.log(action.actions);
    }
    if (action.inputs) {
      merge(inputs, action.inputs);
    }
    for (const act of action.actions) {
      await planAction(context, inputs, act);
    }
  }
}

async function executeAction(context: any, inputs: any, action: Action) {
  if (action.type === "function") {
    console.log(`---- execute: ${action.name}`);
    await action.execute(context, inputs);
  } else if (action.type === "shell") {
    console.log("---- shell:" + action.command);
  } else if (action.type === "call") {
    const targetAction = await getAction(action.targetAction, context, inputs);
    if (action.required && !targetAction) {
      throw new Error("action not exist: " + action.targetAction);
    }
    if (targetAction) {
      if (action.inputs) {
        templateReplace(action.inputs, inputs);
      }
      await executeAction(context, inputs, targetAction);
    }
  } else {
    if (action.inputs) {
      templateReplace(action.inputs, inputs);
    }
    for (const act of action.actions) {
      await executeAction(context, inputs, act);
    }
  }
}

async function testProvision() {
  setTools(new MockTools());
  const projectSetting: ProjectSettings = {
    projectId: "12",
    appName: "huajie0316",
    solutionSettings: {
      name: "fx",
      activeResourcePlugins: ["aad", "azure-storage", "azure-web-app", "azure-bot"],
    },
  };
  const context = createV2Context(projectSetting);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: "",
    platform: Platform.VSCode,
  };
  const action = await getAction("fx.provision", context, inputs);
  if (action) {
    console.log(JSON.stringify(action));
    await planAction(context, inputs, action);
    await executeAction(context, inputs, action);
  }
  console.log(inputs);
}

async function addNodejsBot() {
  setTools(new MockTools());
  const projectSetting: ProjectSettings = {
    projectId: "12",
    appName: "huajie0316",
    solutionSettings: {
      name: "fx",
      activeResourcePlugins: [],
    },
  };
  const context = createV2Context(projectSetting);
  const inputs: v2.InputsWithProjectPath & { resources: string[] } = {
    projectPath: "",
    platform: Platform.VSCode,
    resources: ["nodejs-bot"],
    notification: true,
  };
  const action = await getAction("fx.add", context, inputs);
  if (action) {
    console.log(JSON.stringify(action));
    // const resolved = await resolveAction(context, inputs, action);
    // console.log(JSON.stringify(resolved));
    await planAction(context, inputs, action);
    await executeAction(context, inputs, action);
  }
  console.log(inputs);
  console.log(projectSetting);
}

addNodejsBot();
