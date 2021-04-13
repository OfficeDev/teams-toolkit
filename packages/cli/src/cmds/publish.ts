// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";
import * as path from "path";
import { FxError, err, ok, Result, ConfigMap, ConfigFolderName } from "fx-api";
import activate from "../activate";
import * as constants from "../constants";
import { YargsCommand } from "../yargsCommand";
import { getParamJson } from "../utils";

export default class New extends YargsCommand {
  public readonly commandHead = `publish`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to publish your Teams app";
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
    let rootFolder;
    if (answers.has(manifestFolderParamName)) {
      rootFolder = path.join(answers.getString(manifestFolderParamName)!, "..");
    }
    else {
      rootFolder = answers.getString("folder");
      const manifestFolder = path.join(rootFolder!, `.${ConfigFolderName}`);
      answers.set(manifestFolderParamName, manifestFolder);
    }

    answers.delete("folder");
    const result = await activate(rootFolder);
    if (result.isErr()) {
      return err(result.error);
    }

    const core = result.value;
    {
      const result = await core.publish(answers);
      if (result.isErr()) {
        return err(result.error);
      }
    }
    return ok(null);
  }
}
