// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { getFxCore } from "../../activate";
import { commands } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import UI from "../../userInteraction";

export const upgradeCommand: CLICommand = {
  name: "upgrade",
  description: commands.upgrade.description,
  options: [
    {
      name: "force",
      shortName: "f",
      description: commands.upgrade.options.force,
      type: "boolean",
      default: false,
      required: true,
    },
  ],
  telemetry: {
    event: TelemetryEvent.Upgrade,
  },
  reservedOptionNamesInInteractiveMode: ["force"],
  handler: async (ctx) => {
    const inputs = ctx.optionValues as InputsWithProjectPath;
    // if skipUserConfirm is set, no confirm dialog will be shown
    inputs["skipUserConfirm"] = inputs.force || false;
    if (ctx.optionValues.force) {
      // upgrade is not permitted in nonInteractive mode
      // remove this flag to enable nonInteractive upgrade in e2e case
      delete inputs["nonInteractive"];
    }
    const core = getFxCore();
    const res = await core.phantomMigrationV3(inputs);
    if (res.isOk()) await UI.showMessage("info", commands.upgrade.success, false);
    return res;
  },
};
