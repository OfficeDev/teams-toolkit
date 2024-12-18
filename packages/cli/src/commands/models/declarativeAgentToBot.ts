// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { DeclarativeAgentBotInputs, DeclarativeAgentBotOptions } from "@microsoft/teamsfx-core";
import { getFxCore } from "../../activate";
import { commands } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { ProjectFolderOption } from "../common";

export const declarativeAgentToBotCommand: CLICommand = {
  name: "bot-create",
  description: commands["create.da-bot"].description,
  options: [ProjectFolderOption, ...DeclarativeAgentBotOptions],
  telemetry: {
    event: TelemetryEvent.CreateDeclarativeAgentBot,
  },
  handler: async (ctx) => {
    const inputs = ctx.optionValues as DeclarativeAgentBotInputs;
    const core = getFxCore();
    const res = await core.createDeclarativeAgentBot(inputs);
    return res;
  },
};
