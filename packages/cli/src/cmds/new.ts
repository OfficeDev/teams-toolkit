// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";
import * as path from "path";

import { FxError, err, ok, Result, ConfigMap, Stage, Platform } from "fx-api";

import activate from "../activate";
import * as constants from "../constants";
import { validateAndUpdateAnswers } from "../question/question";
import { YargsCommand } from "../yargsCommand";
import { getParamJson } from "../utils";

export default class New extends YargsCommand {
  public readonly commandHead = `new`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to create a new Teams app project";
  public readonly paramPath = constants.newParamPath;

  public readonly params: { [_: string]: Options } = getParamJson(this.paramPath);

  public builder(yargs: Argv): Argv<any> {
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const answers = new ConfigMap();
    for (const name in this.params) {
      answers.set(name, args[name] || this.params[name].default);
    }

    const rootFolder = path.resolve(answers.getString("folder") || "./");
    answers.set("folder", rootFolder);

    const result = await activate();
    if (result.isErr()) {
      return err(result.error);
    }

    const core = result.value;
    {
      const result = await core.getQuestions!(Stage.create, Platform.CLI);
      if (result.isErr()) {
        return err(result.error);
      }
      await validateAndUpdateAnswers(core, result.value!, answers);
    }

    {
      const result = await core.create(answers);
      if (result.isErr()) {
        return err(result.error);
      }
    }
    return ok(null);
  }
}
