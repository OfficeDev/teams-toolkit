// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  InputsWithProjectPath,
  ok,
  FunctionAction,
  ProvisionContextV3,
} from "@microsoft/teamsfx-api";
import { ComponentNames, ActionTypeFunction, ComponentStateKeys } from "../../../constants";
import { AadAppForTeamsImpl } from "../../../../plugins/resource/aad/plugin";
import { convertContext } from "./provision";

export function GetActionSetApplication(): FunctionAction {
  return {
    name: `${ComponentNames.AadApp}.setApplicationInContext`,
    type: ActionTypeFunction,
    plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      return ok([
        {
          type: "service",
          name: "teams.microsoft.com",
          remarks: "update aad app state",
        },
      ]);
    },
    execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      const ctx = context as ProvisionContextV3;
      const aadAppImplement = new AadAppForTeamsImpl();
      const convertCtx = convertContext(ctx, inputs);
      await aadAppImplement.setApplicationInContext(convertCtx);
      const convertState = convertCtx.envInfo.state.get("fx-resource-aad-app-for-teams");
      convertState.forEach((v: any, k: string) => {
        ctx.envInfo!.state[ComponentStateKeys[ComponentNames.AadApp]][k] = v;
      });
      return ok([
        {
          type: "service",
          name: "teams.microsoft.com",
          remarks: "update aad app state",
        },
      ]);
    },
  };
}
