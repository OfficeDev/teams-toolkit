// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";
import * as path from "path";

import { FxError, err, ok, Result, ConfigMap, Stage } from "fx-api";

import AzureTokenProvider from "../commonlib/azureLogin";
import * as constants from "../constants";
import { validateAndUpdateAnswers } from "../question/question";
import { getParamJson } from "../utils";
import { YargsCommand } from "../yargsCommand";
import { TeamsCore } from "fx-core";
import { ContextFactory } from "../context";

export default class Provision extends YargsCommand {
  public readonly commandHead = `provision`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to provision the project in current working directory";
  public readonly paramPath = constants.provisionParamPath;

  public readonly params: { [_: string]: Options } = getParamJson(this.paramPath);

  public builder(yargs: Argv): Argv<any> {
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const answers = new ConfigMap();
    for (const name in this.params) {
      answers.set(name, args[name] || this.params[name].default);
    }

    const rootFolder = path.resolve(answers.getString("folder") || "./");
    answers.delete("folder");

    if ("subscription" in args) {
      const result = await AzureTokenProvider.setSubscriptionId(args.subscription, rootFolder);
      if (result.isErr()) {
        return result;
      }
    }

    const core = TeamsCore.getInstance();
    {
      const result = await core.getQuestions(ContextFactory.get(rootFolder, Stage.provision));
      if (result.isErr()) {
        return err(result.error);
      }
      await validateAndUpdateAnswers(result.value!, answers);
    }

    {
      const result = await core.provision(ContextFactory.get(rootFolder, Stage.provision), answers);
      if (result.isErr()) {
        return err(result.error);
      }
    }
    return ok(null);
  }
}
