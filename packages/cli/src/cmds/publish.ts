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

export default class Publish extends YargsCommand {
  public readonly commandHead = `publish`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Publish the app to M365 App Portal.";
  public readonly paramPath = constants.publishParamPath;

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

    const manifestFolderParamName = "manifest-folder";
    let result;
    // if input manifestFolderParam(actually also teams-app-id param),
    // this call is from VS platform, since CLI hide these two param from users.
    if (answers.has(manifestFolderParamName)) {
      result = await activate();
    } else {
      const rootFolder = answers.getString("folder");
      answers.delete("folder");
      result = await activate(rootFolder);
    }

    if (result.isErr()) {
      return err(result.error);
    }

    const core = result.value;
    if (answers.has(manifestFolderParamName)) {
      answers.set("platform", Platform.VS);
      const func: Func = {
        namespace: "fx-solution-azure",
        method: "VSpublish"
      };
      result = await core.executeUserTask!(func, answers);
    } else {
      answers.set("platform", Platform.CLI);
      result = await core.publish(answers);
    }
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(null);
  }
}
