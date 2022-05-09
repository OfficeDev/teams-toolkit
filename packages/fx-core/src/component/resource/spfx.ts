// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  CloudResource,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";

@Service("spfx")
export class SpfxResource implements CloudResource {
  readonly name = "spfx";
  outputs = {};
  finalOutputKeys = [];
  deploy(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "spfx.deploy",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "service",
            name: "sharepoint",
            remarks: `deploy spfx with path: ${inputs["spfx"].folder}, type: ${inputs["spfx"].type}`,
          },
        ]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "service",
            name: "sharepoint",
            remarks: `deploy spfx with path: ${inputs["spfx"].folder}, type: ${inputs["spfx"].type}`,
          },
        ]);
      },
    };
    return ok(action);
  }
}
