// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";
import { LanguageStrategy } from "../languageStrategy";
import { Messages } from "../resources/messages";
import { FxResult, FxBotPluginResultFactory as ResultFactory } from "../result";
import { ProgressBarConstants, TemplateProjectsConstants } from "../constants";

import { HostTypes } from "../resources/strings";
import { SomethingMissingError } from "../errors";
import { ProgressBarFactory } from "../progressBars";
import { Logger } from "../logger";
import { TeamsBotImpl } from "../plugin";

export class FunctionsHostedBotImpl extends TeamsBotImpl {
  public async scaffold(context: PluginContext): Promise<FxResult> {
    this.ctx = context;
    throw new Error("not implemented");
  }
}
