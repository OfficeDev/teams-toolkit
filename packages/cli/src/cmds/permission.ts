// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { FxError, err, ok, Result, Stage } from "@microsoft/teamsfx-api";
import { Argv } from "yargs";
import { YargsCommand } from "../yargsCommand";

export class PermissionStatus extends YargsCommand {
  public readonly commandHead = `status`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Check user's permission.";

  public builder(yargs: Argv): Argv<any> {
    return yargs;
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}

export default class Permission extends YargsCommand {
  public readonly commandHead = `permission`;
  public readonly command = `${this.commandHead} <action>`;
  public readonly description = "Check, grant and list user permission.";

  public readonly subCommands: YargsCommand[] = [new PermissionStatus()];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });

    return yargs.version(false);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}
