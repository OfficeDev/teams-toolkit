// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import fs from "fs-extra";
import os from "os";

import {
  QTreeNode,
  FxError,
  Result,
  UserError,
  SystemError,
  err,
  Stage,
  Platform,
  NodeType,
  ok,
  StringArrayValidation,
  Func
} from "fx-api";

import CLILogProvider from "../commonlib/log";
import * as constants from "../constants";
import { UnknownError } from "../error";
import activate from "../activate";
import { flattenNodes } from "../utils";

export abstract class Generator {
  abstract readonly commandName: string;

  abstract readonly outputPath: string;

  readonly doUserTask: boolean = false;
  readonly func?: Func;
  readonly stage?: Stage;

  async generate(projectPath?: string): Promise<Result<QTreeNode | QTreeNode[], FxError>> {
    const result = await activate(projectPath);
    if (result.isErr()) {
      return err(result.error);
    }
    
    const core = result.value;
    {
      const result = this.doUserTask 
        ? await core.getQuestionsForUserTask!(this.func!, Platform.VSCode)
        : await core.getQuestions!(this.stage!, Platform.VSCode);
        
      if (result.isErr()) {
        return err(result.error);
      }
    
      const root = result.value!;
      const allNodes = flattenNodes(root).filter(node => node.data.type !== NodeType.group);
      return ok(allNodes);
    }
  }

  public async run(projectPath?: string) {
    try {
      CLILogProvider.info(this.toLogMsg(`Start to generate '${this.commandName}' parameters`));
      const result = await this.generate(projectPath);
      if (result.isErr()) {
        throw result.error;
      }
      CLILogProvider.info(this.toLogMsg(`Finish to generate '${this.commandName}' parameters`));

      CLILogProvider.info(this.toLogMsg(`Start to write '${this.commandName}' parameters`));
      await this.writeJSON(result.value);
      CLILogProvider.info(this.toLogMsg(`Finish to write '${this.commandName}' parameters to ${this.outputPath}`));
    } catch(e) {
      const FxError: FxError =
        e instanceof UserError || e instanceof SystemError ? e : UnknownError(e);
      let errorMsg = `code:${FxError.source}.${FxError.name}\n\tmessage: ${FxError.message}`;
      if (FxError instanceof UserError && FxError.helpLink) {
        errorMsg += `\n\thelp link: ${FxError.helpLink}`;
      }
      if (FxError instanceof SystemError && FxError.issueLink) {
        errorMsg += `\n\tissue link: ${FxError.issueLink}`;
      }
      if (CLILogProvider.getLogLevel() === constants.CLILogLevel.debug) {
        errorMsg += `\nstack: ${FxError.stack}`;
      }
      CLILogProvider.error(errorMsg);
    }
  }

  public toLogMsg(body: string) {
    return `[ParamGenerator] ${body}`;
  }
  
  public async writeJSON(params: any) {
    return fs.writeJSON(this.outputPath, params, {
      spaces: 4,
      EOL: os.EOL,
      encoding: "utf-8"
    });
  }
}
