// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, ok, Result, Stage } from "@microsoft/teamsfx-api";
import { questionNodes } from "@microsoft/teamsfx-core";
import path from "path";
import { Argv } from "yargs";
import activate from "../activate";
import { EmptyQTreeNode, RootFolderNode } from "../constants";
import { toYargsOptionsGroup } from "../questionUtils";
import cliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { flattenNodes, getSystemInputs } from "../utils";
import { YargsCommand } from "../yargsCommand";

export class AddWebpart extends YargsCommand {
  public readonly commandHead = `spfx-web-part`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Auto-hosted SPFx web part tightly integrated with Microsoft Teams";

  public override async builder(yargs: Argv): Promise<Argv<any>> {
    {
      const node = questionNodes.addWebpart();
      const filteredNode = node;
      const nodes = flattenNodes(filteredNode).concat([RootFolderNode]);
      this.params = await toYargsOptionsGroup(nodes);
    }
    return yargs.options(this.params);
  }

  public override async runCommand(args: {
    [argName: string]: string;
  }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    cliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.AddWebpartStart);

    const resultFolder = await activate(rootFolder);
    if (resultFolder.isErr()) {
      cliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.AddWebpart, resultFolder.error);
      return err(resultFolder.error);
    }
    const core = resultFolder.value;
    const inputs = getSystemInputs(rootFolder, args.env);
    inputs.stage = Stage.addWebpart;
    const result = await core.addWebpart(inputs);
    if (result.isErr()) {
      cliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.AddWebpart, result.error);
      return err(result.error);
    }

    cliTelemetry.sendTelemetryEvent(TelemetryEvent.AddWebpart, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });

    return ok(null);
  }
}

export default class Add extends YargsCommand {
  public readonly commandHead = `add`;
  public readonly command = `${this.commandHead} <feature>`;
  public readonly description = "Adds features to your Teams application.";

  public readonly subCommands: YargsCommand[] = [new AddWebpart()];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs
      .option("feature", {
        choices: this.subCommands.map((c) => c.commandHead),
        global: false,
        hidden: true,
      })
      .version(false);
  }

  public runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return new Promise((resolve) => resolve(ok(null)));
  }
}
