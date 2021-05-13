// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";
import * as path from "path";

import {
  FxError,
  err,
  ok,
  Result,
  ConfigMap,
  Stage,
  Platform,
  MultiSelectQuestion,
  OptionItem,
} from "@microsoft/teamsfx-api";

import activate from "../activate";
import * as constants from "../constants";
import { validateAndUpdateAnswers } from "../question/question";
import { YargsCommand } from "../yargsCommand";
import { flattenNodes, getParamJson } from "../utils";

export default class Deploy extends YargsCommand {
  public readonly commandHead = `deploy`;
  public readonly command = `${this.commandHead} [components...]`;
  public readonly description = "Deploy the current application.";
  public readonly paramPath = constants.deployParamPath;

  public params: { [_: string]: Options } = getParamJson(this.paramPath);
  public readonly deployPluginNodeName = "deploy-plugin";

  public builder(yargs: Argv): Argv<any> {
    const deployPluginOption = this.params[this.deployPluginNodeName];
    yargs.positional("components", {
      array: true,
      choices: deployPluginOption.choices,
      description: deployPluginOption.description,
    });
    for (const name in this.params) {
      if (name !== this.deployPluginNodeName) {
        yargs.options(name, this.params[name]);
      }
    }
    return yargs.version(false);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const answers = new ConfigMap();
    for (const name in this.params) {
      answers.set(name, args[name] || this.params[name].default);
    }

    const rootFolder = path.resolve(answers.getString("folder") || "./");
    answers.delete("folder");

    const result = await activate(rootFolder);
    if (result.isErr()) {
      return err(result.error);
    }

    const core = result.value;
    {
      const result = await core.getQuestions!(Stage.deploy, Platform.CLI);
      if (result.isErr()) {
        return err(result.error);
      }
      const rootNode = result.value!;
      const allNodes = flattenNodes(rootNode);
      const deployPluginNode = allNodes.find(
        (node) => node.data.name === this.deployPluginNodeName
      )!;
      const components = (args.components as string[]) || [];
      if (components.length === 0) {
        const option = (deployPluginNode.data as MultiSelectQuestion).option as OptionItem[];
        answers.set(
          this.deployPluginNodeName,
          option.map((op) => op.cliName)
        );
      } else {
        answers.set(this.deployPluginNodeName, components);
      }
      await validateAndUpdateAnswers(result.value!, answers);
    }

    {
      const result = await core.deploy(answers);
      if (result.isErr()) {
        return err(result.error);
      }
    }
    return ok(null);
  }
}
