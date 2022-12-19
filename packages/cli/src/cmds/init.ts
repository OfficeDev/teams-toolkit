// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, err, ok, Stage, Platform } from "@microsoft/teamsfx-api";
import path from "path";
import { Argv } from "yargs";
import activate from "../activate";
import * as constants from "../constants";
import { toYargsOptionsGroup } from "../questionUtils";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { flattenNodes, getSystemInputs } from "../utils";
import { YargsCommand } from "../yargsCommand";

abstract class InitBase extends YargsCommand {
  abstract readonly telemetryStartEvent: TelemetryEvent;
  abstract readonly telemetryEvent: TelemetryEvent;
  abstract readonly stage: Stage.initInfra | Stage.initDebug;

  public async builder(yargs: Argv): Promise<Argv<any>> {
    const result = await activate();
    if (result.isErr()) {
      throw result.error;
    }
    const core = result.value;
    {
      const result = await core.getQuestions(this.stage, { platform: Platform.CLI_HELP });
      if (result.isErr()) {
        throw result.error;
      }
      const node = result.value ?? constants.EmptyQTreeNode;
      const filteredNode = node;
      const nodes = flattenNodes(filteredNode);
      this.params = toYargsOptionsGroup(nodes);
    }
    return yargs.options(this.params).options(constants.RootFolderOptions);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve((args.folder as string) || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(this.telemetryStartEvent);

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(this.telemetryEvent, result.error);
      return err(result.error);
    }

    const core = result.value;
    const inputs = getSystemInputs(rootFolder);

    const initResult =
      this.stage === Stage.initInfra ? await core.initInfra(inputs) : await core.initDebug(inputs);
    if (initResult.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(this.telemetryEvent, initResult.error);
      return err(initResult.error);
    }

    CliTelemetry.sendTelemetryEvent(this.telemetryEvent, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
    return ok(null);
  }
}

export class InitInfra extends InitBase {
  public readonly telemetryStartEvent = TelemetryEvent.InitInfraStart;
  public readonly telemetryEvent = TelemetryEvent.InitInfra;
  public readonly stage = Stage.initInfra;
  public readonly commandHead = `infra`;
  public readonly command = this.commandHead;
  public readonly description = "Initialize the infrastructure of the project.";
}

export class InitDebug extends InitBase {
  public readonly telemetryStartEvent = TelemetryEvent.InitDebugStart;
  public readonly telemetryEvent = TelemetryEvent.InitDebug;
  public readonly stage = Stage.initDebug;
  public readonly commandHead = `debug`;
  public readonly command = this.commandHead;
  public readonly description = "Initialize the debug resources of the project.";
}

export default class Init extends YargsCommand {
  public readonly commandHead = `init`;
  public readonly command = `${this.commandHead} <part>`;
  // TODO: change the string.
  public readonly description = "Initialize the project for using Teams Toolkit.";

  public readonly subCommands: YargsCommand[] = [new InitInfra(), new InitDebug()];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs
      .options("part", {
        choices: this.subCommands.map((c) => c.commandHead),
        global: false,
        hidden: true,
      })
      .version(false);
  }

  public async runCommand(args: any): Promise<Result<null, FxError>> {
    return ok(null);
  }
}
