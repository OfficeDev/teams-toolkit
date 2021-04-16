// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";
import * as path from "path";
import { FxError, err, ok, Result, ConfigMap, Platform, Func } from "fx-api";
import activate from "../activate";
import * as constants from "../constants";
import { YargsCommand } from "../yargsCommand";
import { getParamJson } from "../utils";

export default class New extends YargsCommand {
  public readonly commandHead = `build`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to build your Teams app";
  public readonly paramPath = constants.buildParamPath;

  public readonly params: { [_: string]: Options } = getParamJson(this.paramPath);

  public builder(yargs: Argv): Argv<any> {
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const answers = new ConfigMap();
    for (const name in this.params) {
      if (!args[name]) {
        continue;
      }
      if (name.endsWith("folder")) {
        answers.set(name, path.resolve(args[name] as string));
      } else {
        answers.set(name, args[name]);
      }
    }

    const rootFolder = answers.getString("folder");
    answers.delete("folder");
    answers.set("platform", Platform.CLI);
    const result = await activate(rootFolder);
    if (result.isErr()) {
      return err(result.error);
    }
    const core = result.value;
    {
      const func: Func = {
        namespace: "fx-solution-azure",
        method: "buildPackage"
      };
      const result = await core.executeUserTask!(func, answers);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    return ok(null);
  }
}
