// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  Effect,
  FunctionAction,
  FxError,
  GroupAction,
  InputsWithProjectPath,
  Json,
  MaybePromise,
  ok,
  QTreeNode,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { getProjectSettingsPath } from "../../core/middleware/projectSettingsLoader";
import { getComponent } from "../workflow";
import "../connection/azureWebAppConfig";
import "../resource/azureSql";
import { ComponentNames } from "../constants";
import { ApiConnectorImpl } from "../../plugins/resource/apiconnector/plugin";
@Service("api-connector")
export class ApiConnector {
  name = "api-connector";
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(new AddApiConnectorAction());
  }
}

export class AddApiConnectorAction implements FunctionAction {
  name = "api-connector.add";
  type: "function" = "function";
  apiConnectorImpl: ApiConnectorImpl = new ApiConnectorImpl();
  async question(context: ContextV3, inputs: InputsWithProjectPath) {
    return await this.apiConnectorImpl.generateQuestion(context, inputs);
  }
  async execute(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Effect[], FxError>> {
    await this.apiConnectorImpl.scaffold(context, inputs);
    return ok([] as Effect[]);
  }
}
