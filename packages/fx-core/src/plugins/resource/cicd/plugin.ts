// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";
import { FxResult, FxCICDPluginResultFactory as ResultFactory } from "./result";
import { Logger } from "./logger";
import { FileNames, Messages, PluginCICD } from "./constants";
import * as fs from "fs-extra";
import { InternalError } from "./errors";
import { getTemplatesFolder } from "../../..";
import * as path from "path";

export class CICDImpl {
  private ctx?: PluginContext;

  public async addCICDWorkflows(context: PluginContext): Promise<FxResult> {
    this.ctx = context;
    Logger.info("Calling addCICDWorkflows.");
    return ResultFactory.Success();
  }
}
