// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";

import { FxError, err, ok, Result, Func, ConfigMap, Platform } from "fx-api";

import { YargsCommand } from "../yargsCommand";
import activate from "../activate";

export default class Init extends YargsCommand {
  public readonly commandHead = `init`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Initialize an existing app";

  public readonly params: { [_: string]: Options } = {
    "app-name": {
      type: "string",
      description: "the name of teams app",
      default: "TeamsBlazorApp"
    },
    environment: {
      type: "string",
      description: "local|remote",
      choices: ["local", "remote"],
      default: "local"
    },
    endpoint: {
      type: "string",
      description: "the endpoint of teams app",
      default: "https://localhost:44357"
    },
    "root-path": {
      type: "string",
      description: "the path of the setting files",
      default: "./"
    }
  };

  public builder(yargs: Argv): Argv<any> {
    return yargs
      .version(false)
      .options("verbose", {
        description: "Prints all necessary information.",
        boolean: true,
        default: false
      })
      .options(this.params);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const answers = new ConfigMap();
    for (const name in this.params) {
      answers.set(name, args[name] || this.params[name].default);
    }

    const result = await activate();
    if (result.isErr()) {
      return err(result.error);
    }

    const core = result.value;
    {
      answers.set("platform", Platform.VS);

      const func: Func = {
        namespace: "fx-solution-azure",
        method: "registerTeamsAppAndAad"
      };

      const result = await core.executeUserTask!(func, answers);
      if (result.isErr()) {
        return err(result.error);
      }
      console.info(JSON.stringify(result.value, null, 4));
    }
    return ok(null);
  }
}
