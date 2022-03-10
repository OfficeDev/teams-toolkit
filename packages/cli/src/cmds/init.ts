// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { YargsCommand } from "../yargsCommand";

export default class Init extends YargsCommand {
  public readonly commandHead = `init`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Initialize an existing application.";

  public builder(yargs: Argv): Argv<any> {
    throw new Error("Method not implemented.");
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    throw new Error("Method not implemented.");
  }
}
