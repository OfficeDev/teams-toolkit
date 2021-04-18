// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import {Argv, Options} from "yargs";

import {ConfigMap, err, FxError, ok, Platform, Result, Stage} from "fx-api";

import AzureTokenProvider from "../commonlib/azureLogin";
import * as constants from "../constants";
import {validateAndUpdateAnswers} from "../question/question";
import {getParamJson} from "../utils";
import {YargsCommand} from "../yargsCommand";
import {TeamsCore} from "../../../fx-core/build/core";
import {ContextFactory} from "../context";

export class CapabilityAddTab extends YargsCommand {
  public readonly commandHead = `tab`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to add tab capability to the project.";
  public readonly paramPath = constants.capabilityAddTabParamPath;
  public readonly params: {[_: string]: Options;} = getParamJson(this.paramPath);

  public builder(yargs: Argv): Argv<any> {
    return yargs.options(this.params);
  }

  public async runCommand(args: {[argName: string]: string;}): Promise<Result<null, FxError>> {
    const answers = new ConfigMap();
    for (const name in this.params) {
      answers.set(name, args[name] || this.params[name].default);
    }

    const rootFolder = path.resolve(answers.getString("folder") || "./");
    answers.delete("folder");

    const func = {
      namespace: "fx-solution-azure",
      method: "addCapability"
    };

    const core = TeamsCore.getInstance();
    {
      const result = await core.getQuestionsForUserTask(ContextFactory.get(rootFolder, Stage.update), func);
      if (result.isErr()) {
        return err(result.error);
      }
      await validateAndUpdateAnswers(result.value!, answers);
    }

    {
      const result = await core.executeUserTask(ContextFactory.get(rootFolder, Stage.update), func, answers);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    return ok(null);
  }
}

export class CapabilityAddBot extends YargsCommand {
  public readonly commandHead = `bot`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to add bot capability to the project.";
  public readonly paramPath = constants.capabilityAddBotParamPath;
  public readonly params: {[_: string]: Options;} = getParamJson(this.paramPath);

  public builder(yargs: Argv): Argv<any> {
    return yargs.options(this.params);
  }

  public async runCommand(args: {[argName: string]: string;}): Promise<Result<null, FxError>> {
    const answers = new ConfigMap();
    for (const name in this.params) {
      answers.set(name, args[name] || this.params[name].default);
    }

    const rootFolder = path.resolve(answers.getString("folder") || "./");
    answers.delete("folder");

    if ("subscription" in args && !!args.subscription) {
      const result = await AzureTokenProvider.setSubscriptionId(args.subscription, rootFolder);
      if (result.isErr()) {
        return result;
      }
    }

    const func = {
      namespace: "fx-solution-azure",
      method: "addCapability"
    };

    const core = TeamsCore.getInstance();
    {
      const result = await core.getQuestionsForUserTask(ContextFactory.get(rootFolder, Stage.update), func);
      if (result.isErr()) {
        return err(result.error);
      }
      await validateAndUpdateAnswers(result.value!, answers);
    }

    {
      const result = await core.executeUserTask(ContextFactory.get(rootFolder, Stage.update), func, answers);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    return ok(null);
  }
}

export class CapabilityAdd extends YargsCommand {
  public readonly commandHead = `add`;
  public readonly command = `${this.commandHead} <capability> [options]`;
  public readonly description =
    "A command to add a capability to the project in current working directory";

  public readonly subCommands: YargsCommand[] = [new CapabilityAddTab(), new CapabilityAddBot()];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs;
  }

  public async runCommand(args: {[argName: string]: string;}): Promise<Result<null, FxError>> {
    return ok(null);
  }
}

export default class Capability extends YargsCommand {
  public readonly commandHead = `capability`;
  public readonly command = `${this.commandHead} <action> [options]`;
  public readonly description = "Operate the capability";

  public readonly subCommands: YargsCommand[] = [new CapabilityAdd()];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs.version(false);
  }

  public async runCommand(args: {[argName: string]: string;}): Promise<Result<null, FxError>> {
    return ok(null);
  }
}
