// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  Action,
  ContextV3,
  MaybePromise,
  InputsWithProjectPath,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { AzureResource } from "./azureResource";

@Service("azure-web-app")
export class AzureWebAppResource extends AzureResource {
  readonly name = "azure-web-app";
  readonly bicepModuleName = "azureWebApp";
  readonly outputs = {
    resourceId: {
      key: "resourceId",
      bicepVariable: "provisionOutputs.azureWebAppOutput.value.resourceId",
    },
    domain: {
      key: "domain",
      bicepVariable: "provisionOutputs.azureWebAppOutput.value.domain",
    },
    endpoint: {
      key: "endpoint",
      bicepVariable: "provisionOutputs.azureWebAppOutput.value.endpoint",
    },
  };
  readonly finalOutputKeys = ["resourceId", "endpoint"];
  deploy(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-web-app.deploy",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: `deploy azure web app in folder: ${path.join(
              inputs.projectPath,
              inputs["azure-web-app"].folder
            )}`,
          },
        ]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: `deploy azure web app in folder: ${path.join(
              inputs.projectPath,
              inputs["azure-web-app"].folder
            )}`,
          },
        ]);
      },
    };
    return ok(action);
  }
}
