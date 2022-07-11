// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  InputsWithProjectPath,
  ok,
  FunctionAction,
  FileEffect,
  ProvisionContextV3,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import {
  ComponentNames,
  ActionTypeFunction,
  ActionNames,
  ComponentStateKeys,
} from "../../../constants";
import { generateAadManifestTemplate } from "../../../../core/generateAadManifestTemplate";
import { AadAppForTeamsImpl } from "../../../../plugins/resource/aad/plugin";
import { convertContext } from "./provision";

export function GetActionConfigure(): FunctionAction {
  return {
    name: `${ComponentNames.AadApp}.${ActionNames.configure}`,
    type: ActionTypeFunction,
    plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      return ok([
        {
          type: "service",
          name: "teams.microsoft.com",
          remarks: "configure aad app",
        },
      ]);
    },
    execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      const ctx = context as ProvisionContextV3;
      const aadAppImplement = new AadAppForTeamsImpl();
      const convertCtx = convertContext(ctx, inputs);
      await aadAppImplement.postProvisionUsingManifest(convertCtx);
      const convertState = convertCtx.envInfo.state.get("fx-resource-aad-app-for-teams");
      convertState.forEach((v: any, k: string) => {
        ctx.envInfo!.state[ComponentStateKeys[ComponentNames.AadApp]][k] = v;
      });
      return ok([
        {
          type: "service",
          name: "teams.microsoft.com",
          remarks: "configure aad app",
        },
      ]);
    },
  };
}
