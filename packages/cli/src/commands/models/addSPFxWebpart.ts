// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, Stage } from "@microsoft/teamsfx-api";
import { SPFxAddWebpartInputs, SPFxAddWebpartOptions } from "@microsoft/teamsfx-core";
import { getFxCore } from "../../activate";
import { commands } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { ProjectFolderOption } from "../common";

export const addSPFxWebpartCommand: CLICommand = {
  name: "spfx-web-part",
  description: commands["add.spfx-web-part"].description,
  options: [...SPFxAddWebpartOptions, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.AddWebpart,
  },
  handler: async (ctx) => {
    const inputs = ctx.optionValues as SPFxAddWebpartInputs;
    inputs.stage = Stage.addWebpart;
    const core = getFxCore();
    const res = await core.addWebpart(inputs);
    return res;
  },
};
