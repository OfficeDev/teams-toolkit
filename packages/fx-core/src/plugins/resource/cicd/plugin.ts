// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Context } from "@microsoft/teamsfx-api";
import { FxResult, FxCICDPluginResultFactory as ResultFactory } from "./result";
import { Logger } from "./logger";

export class CICDImpl {
  public async addCICDWorkflows(context: Context): Promise<FxResult> {
    Logger.info("Calling addCICDWorkflows.");
    return ResultFactory.Success();
  }
}
