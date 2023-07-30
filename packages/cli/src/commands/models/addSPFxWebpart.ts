// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { err, ok } from "@microsoft/teamsfx-api";
import { assign } from "lodash";
import { createFxCore } from "../../activate";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { CLICommand, CLIContext } from "../types";

export const addSPFxWebpartCommand: CLICommand = {
  name: "spfx-web-part",
  description: "Auto-hosted SPFx web part tightly integrated with Microsoft Teams.",
  options: [
    {
      name: "spfx-folder",
      type: "text",
      shortName: "sf",
      description: "Directory path that contains the existing SarePoint Framework solutions.",
      required: true,
    },
    {
      name: "spfx-webpart-name",
      type: "text",
      shortName: "sw",
      description: "Name for SharePoint Framework Web Part.",
      required: true,
      default: "helllworld",
    },
    {
      name: "manifest-path",
      type: "text",
      shortName: "mr",
      description: "Specifies Teams manifest.json file path.",
    },
    {
      name: "local-manifest-path",
      type: "text",
      shortName: "ml",
      description: "Specifies local Teams manifest.json file path.",
    },
    {
      name: "folder",
      shortName: "f",
      description: "Root folder of the project.",
      type: "text",
      required: true,
      default: "./",
    },
  ],
  telemetry: {
    event: TelemetryEvent.AddWebpart,
  },
  handler: async (ctx: CLIContext) => {
    const projectPath = ctx.optionValues.folder as string;
    const core = createFxCore();
    const inputs = getSystemInputs(projectPath);
    if (!ctx.globalOptionValues.interactive) {
      assign(inputs, ctx.optionValues);
    }
    const res = await core.addWebpart(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};
