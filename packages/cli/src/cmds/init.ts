// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";

import { FxError, err, ok, Result, Func, ConfigMap, Platform, Stage } from "fx-api";

import { YargsCommand } from "../yargsCommand";
import { TeamsCore } from "fx-core";
import { ContextFactory } from "../context";

export default class Init extends YargsCommand {
  public readonly commandHead = `init`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to register Teams app ID and AAD app";

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

    const core = TeamsCore.getInstance();
    {
      answers.set("platform", Platform.VS);

      const func: Func = {
        namespace: "fx-solution-azure",
        method: "registerTeamsAppAndAad"
      };

      const result = await core.executeUserTask(
        ContextFactory.get(args["root-path"] as string, Stage.userTask),
        func,
        answers
      );

      if (result.isErr()) {
        return err(result.error);
      }
      console.info(JSON.stringify(result.value, null, 4));
    }
    return ok(null);
  }
}
