// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, err, ok } from "@microsoft/teamsfx-api";
import { SFPxAddWebpartInputs, SFPxAddWebpartOptions } from "@microsoft/teamsfx-core";
import { createFxCore } from "../../activate";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { ProjectFolderOption } from "../common";

export const addSPFxWebpartCommand: CLICommand = {
  name: "spfx-web-part",
  description: "Auto-hosted SPFx web part tightly integrated with Microsoft Teams.",
  options: [...SFPxAddWebpartOptions, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.AddWebpart,
  },
  handler: async (ctx) => {
    const inputs = ctx.optionValues as SFPxAddWebpartInputs;
    const core = createFxCore();
    const res = await core.addWebpart(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};
