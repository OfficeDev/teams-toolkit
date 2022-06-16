// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  InputsWithProjectPath,
  ok,
  FunctionAction,
  ProvisionContextV3,
} from "@microsoft/teamsfx-api";
import { ComponentNames, ActionNames, ActionTypeFunction } from "../../../constants";

export function GetActionProvision(): FunctionAction {
  return {
    name: `${ComponentNames.AzureSQL}.${ActionNames.provision}`,
    type: ActionTypeFunction,
    question: (context: ContextV3, inputs: InputsWithProjectPath) => {
      return ok(undefined);
    },
    plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
      return ok(["collect user inputs for sql account"]);
    },
    execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      const ctx = context as ProvisionContextV3;
      ctx.envInfo.state[ComponentNames.AzureSQL] = ctx.envInfo.state[ComponentNames.AzureSQL] || {};

      context.envInfo!.state["azure-sql"].password = "MockSqlPassword";
      return ok(["collect user inputs for sql account"]);
    },
  };
}
