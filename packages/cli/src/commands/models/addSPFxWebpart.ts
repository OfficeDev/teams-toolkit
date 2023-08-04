// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { SPFxAddWebpartInputs, SPFxAddWebpartOptions } from "@microsoft/teamsfx-core";
import { createFxCore } from "../../activate";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { ProjectFolderOption } from "../common";

export const addSPFxWebpartCommand: CLICommand = {
  name: "spfx-web-part",
  description: "Auto-hosted SPFx web part tightly integrated with Microsoft Teams.",
  options: [...SPFxAddWebpartOptions, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.AddWebpart,
  },
  handler: async (ctx) => {
    const inputs = ctx.optionValues as SPFxAddWebpartInputs;
    const core = createFxCore();
    const res = await core.addWebpart(inputs);
    return res;
  },
};
