// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";
import { FxResult, FxBotPluginResultFactory as ResultFactory } from "./result";
import { Logger } from "./logger";
import { Messages } from "./constants";

export class CICDImpl {
  private ctx?: PluginContext;

  public async preScaffold(context: PluginContext): Promise<FxResult> {
    this.ctx = context;
    Logger.info(Messages.PreScaffoldingCICD);

    return ResultFactory.Success();
  }

  public async scaffold(context: PluginContext): Promise<FxResult> {
    this.ctx = context;
    Logger.info(Messages.ScaffoldingCICD);

    Logger.info(Messages.SuccessfullyScaffoldedCICD);

    return ResultFactory.Success();
  }
}
