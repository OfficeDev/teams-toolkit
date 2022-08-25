// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { ContextV3, FxError, InputsWithProjectPath, Result } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { ApiConnectorImpl } from "./apiconnector/ApiConnectorImpl";
import { ResultFactory } from "./apiconnector/result";
import { UserTaskFunctionName } from "../../plugins/solution/fx-solution/constants";
import "../connection/azureWebAppConfig";
import { ComponentNames } from "../constants";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import "../resource/azureSql";

export const apiConnectorImpl: ApiConnectorImpl = new ApiConnectorImpl();
@Service(ComponentNames.ApiConnector)
export class ApiConnector {
  name = ComponentNames.ApiConnector;
  @hooks([
    ActionExecutionMW({
      question: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        return await apiConnectorImpl.generateQuestion(context, inputs);
      },
    }),
  ])
  async add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Record<string, any>, FxError>> {
    const res = await apiConnectorImpl.scaffold(context, inputs);
    return ResultFactory.Success({ func: UserTaskFunctionName.ConnectExistingApi, ...res });
  }
}
