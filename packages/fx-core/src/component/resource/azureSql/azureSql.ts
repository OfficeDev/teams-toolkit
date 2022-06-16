// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  Action,
  CloudResource,
  ContextV3,
  MaybePromise,
  InputsWithProjectPath,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { AzureSqlOutputs, ComponentNames } from "../../constants";
import { ConfigureActionImplement } from "./actions/configure";
import { GetActionGenerateBicep } from "./actions/generateBicep";
import { GetActionProvision } from "./actions/provision";
@Service("azure-sql")
export class AzureSqlResource implements CloudResource {
  readonly name = ComponentNames.AzureSQL;
  readonly outputs = AzureSqlOutputs;
  readonly finalOutputKeys = ["sqlResourceId", "endpoint", "databaseName"];
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(GetActionGenerateBicep());
  }
  provision(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(GetActionProvision());
  }
  configure(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(ConfigureActionImplement.get());
  }
}
