// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";
import * as path from "path";

import { FxError, err, ok, Result, ConfigMap, Stage } from "fx-api";

import * as constants from "../constants";
import { validateAndUpdateAnswers } from "../question/question";
import { YargsCommand } from "../yargsCommand";
import { getParamJson } from "../utils";
import { TeamsCore } from "fx-core";
import { ContextFactory } from "../context";

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

    const core = TeamsCore.getInstance();
    {
      const result = await core.getQuestions(ContextFactory.get(rootFolder, Stage.create));
      if (result.isErr()) {
        return err(result.error);
      }
      await validateAndUpdateAnswers(result.value!, answers);
    }

    {
      const result = await core.create(ContextFactory.get(rootFolder, Stage.create), answers);
      if (result.isErr()) {
        return err(result.error);
      }
    }
    return ok(null);
  }
}
