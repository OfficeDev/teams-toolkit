// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, err, ok } from "@microsoft/teamsfx-api";
import path from "path";
import { createFxCore } from "../../activate";
import { strings } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import UI from "../../userInteraction";
import { getSystemInputs } from "../../utils";

export const upgradeCommand: CLICommand = {
  name: "upgrade",
  description: strings.command.upgrade.description,
  telemetry: {
    event: TelemetryEvent.Upgrade,
  },
  handler: async (ctx) => {
    const rootFolder = path.resolve((ctx.optionValues.folder as string) || "./");
    const inputs = getSystemInputs(rootFolder);
    // TODO to confirm
    inputs["skipUserConfirm"] = false;
    if (ctx.optionValues.force) {
      // as upgrade will block nonInteractive command, remove it to run upgrade when args.force is setting.
      delete inputs["nonInteractive"];
    }
    const core = createFxCore();
    const upgradeResult = await core.phantomMigrationV3(inputs);
    if (upgradeResult.isErr()) {
      return err(upgradeResult.error);
    }
    await UI.showMessage("info", strings.command.upgrade.success, false);
    return ok(undefined);
  },
};
