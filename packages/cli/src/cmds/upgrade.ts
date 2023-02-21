// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, err, ok, Void } from "@microsoft/teamsfx-api";
import path from "path";
import { Argv } from "yargs";
import activate from "../activate";
import { strings } from "../resource";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import userInteraction from "../userInteraction";
import { getSystemInputs } from "../utils";
import { YargsCommand } from "../yargsCommand";

export default class Upgrade extends YargsCommand {
  public readonly commandHead = `upgrade`;
  public readonly command = `${this.commandHead}`;
  public readonly description = strings.command.upgrade.description;

  public readonly forceParam = "force";

  builder(yargs: Argv): Argv<any> {
    yargs.option(this.forceParam, {
      description: strings.command.upgrade.options.force,
      type: "boolean",
    });
    return yargs.version(false).hide("interactive");
  }

  async runCommand(args: { [argName: string]: string }): Promise<Result<any, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.UpgradeStart);

    const inputs = getSystemInputs(rootFolder, args.env);
    inputs["skipUserConfirm"] = args.force;

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Upgrade, result.error);
      return err(result.error);
    }

    const core = result.value;
    const upgradeResult = await core.phantomMigrationV3(inputs);
    if (upgradeResult.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Upgrade, upgradeResult.error);
      return err(upgradeResult.error);
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.Upgrade, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
    await userInteraction.showMessage("info", strings.command.upgrade.success, false);
    return ok(Void);
  }
}
