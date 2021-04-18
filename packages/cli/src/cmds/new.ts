// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {Argv, Options} from "yargs";

import {FxError, err, ok, Result, Stage, Platform, ConfigMap, QTreeNode, NodeType, Question, isAutoSkipSelect, SingleSelectQuestion, MultiSelectQuestion} from "fx-api";

import * as constants from "../constants";
import {validateAndUpdateAnswers, visitInteractively} from "../question/question";
import {YargsCommand} from "../yargsCommand";
import {flattenNodes, getJson, toConfigMap, toYargsOptions} from "../utils";
import {TeamsCore} from "../../../fx-core/build/core";
import {ContextFactory} from "../context";

export default class New extends YargsCommand {
  public readonly commandHead = `new`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to create a new Teams app project";
  public readonly paramPath = constants.newParamPath;

  public readonly root = getJson<QTreeNode>(this.paramPath);
  public params: {[_: string]: Options;} = {};
  public answers: ConfigMap = new ConfigMap();

  public builder(yargs: Argv): Argv<any> {
    if (this.root) {
      const nodes = flattenNodes(this.root);
      const nodesWithoutGroup = nodes.filter((node) => node.data.type !== NodeType.group);
      for (const node of nodesWithoutGroup) {
        if (node.data.name === "folder") {
          (node.data as any).default = "./";
        }
        // (node.data as any).hide = true;
      }
      nodesWithoutGroup.forEach((node) => {
        const data = node.data as Question;
        if (isAutoSkipSelect(data)) {
          // set the only option to default value so yargs will auto fill it.
          data.default = getSingleOptionString(data as (SingleSelectQuestion | MultiSelectQuestion));
          (data as any).hide = true;
        }
        this.params[data.name] = toYargsOptions(data);
      });
      yargs.options({
        "interactive": {
          description: "Whether scaffold interactively",
          boolean: true,
          default: true
        }
      }).options(this.params);
    }
    return yargs.version(false);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    if (args.interactive) {
      if (this.root) {
        /// TODO: enable remote validation function
        const answers = await visitInteractively(this.root);
        this.answers = toConfigMap(answers);
      }
    } else {
      for (const name in this.params) {
        this.answers.set(name, args[name] || this.params[name].default);
      }
    }

    const core = TeamsCore.getInstance();
    const ctx = ContextFactory.get("./", Stage.create);
    {
      const result = await core.getQuestions(ctx);
      if (result.isErr()) {
        return err(result.error);
      }
      await validateAndUpdateAnswers(result.value!, this.answers);
    }

    {
      const result = await core.create(ctx, this.answers);
      if (result.isErr()) {
        return err(result.error);
      } else {
        await ctx.dialog?.communicate(
          new DialogMsg(DialogType.Ask, {
            type: QuestionType.OpenFolder,
            description: result.value,
          }),
        );
      }
    }
    return ok(null);
  }
}
