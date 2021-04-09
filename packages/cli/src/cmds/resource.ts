// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import { Argv, Options } from "yargs";

import { ConfigMap, err, Func, FxError, ok, Platform, Result, Stage } from "fx-api";

import activate from "../activate";
import AzureTokenProvider from "../commonlib/azureLogin1st";
import * as constants from "../constants";
import { validateAndUpdateAnswers } from "../question/question";
import { getParamJson, readConfigs } from "../utils";
import { YargsCommand } from "../yargsCommand";

export class ResourceAdd extends YargsCommand {
  public readonly commandHead = `add`;
  public readonly command = `${this.commandHead} <resource-type>`;
  public readonly description =
    "A command to add a resource to the project in current working directory";

  public readonly subCommands: YargsCommand[] = [new ResourceAddSql(), new ResourceAddFunction()];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });

    return yargs;
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}

export class ResourceAddSql extends YargsCommand {
  public readonly commandHead = `azure-sql`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to add Azure SQL resource to the project.";
  public readonly paramPath = constants.resourceAddSqlParamPath;
  public readonly params: { [_: string]: Options } = getParamJson(this.paramPath);

  public builder(yargs: Argv): Argv<any> {
    return yargs.options(this.params);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
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
      const result = await core.getQuestions!(Stage.update, Platform.VSCode);
      if (result.isErr()) {
        return err(result.error);
      }
      await validateAndUpdateAnswers(core, result.value!, answers);
    }

    {
      const result = await core.update(answers);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    return ok(null);
  }
}

export class ResourceAddFunction extends YargsCommand {
  public readonly commandHead = `azure-function`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to add Azure Function resource to the project.";
  public readonly paramPath = constants.resourceAddFunctionParamPath;
  public readonly params: { [_: string]: Options } = getParamJson(this.paramPath);

  public builder(yargs: Argv): Argv<any> {
    return yargs.options(this.params);
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

    const result = await activate(rootFolder);
    if (result.isErr()) {
      return err(result.error);
    }

    const core = result.value;
    {
      const result = await core.getQuestions!(Stage.update, Platform.VSCode);
      if (result.isErr()) {
        return err(result.error);
      }
      await validateAndUpdateAnswers(core, result.value!, answers);
    }

    {
      const result = await core.update(answers);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    return ok(null);
  }
}

export class ResourceConfigure extends YargsCommand {
  public readonly commandHead = `configure`;
  public readonly command = `${this.commandHead} <resource-type> [options]`;
  public readonly description = "A command to configure a resource";

  public readonly subCommands: YargsCommand[] = [new ResourceConfigureAAD()];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });

    return yargs;
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}

export class ResourceConfigureAAD extends YargsCommand {
  public readonly commandHead = `aad`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to configure Azure AD.";
  public readonly paramPath = constants.resourceConfigureAadParamPath;
  public readonly params: { [_: string]: Options } = getParamJson(this.paramPath);

  public builder(yargs: Argv): Argv<any> {
    return yargs.options(this.params);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
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
    let func: Func = {
      namespace: "fx-solution-azure/teamsfx-plugin-aad-app-for-teams",
      method: "aadUpdatePermission"
    };
    {
      const result = await core.executeUserTask!(func, answers);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    return ok(null);
  }
}

export class ResourceShow extends YargsCommand {
  public readonly commandHead = `show`;
  public readonly command = `${this.commandHead} <resource-type> [options]`;
  public readonly description = "A command to show configuration details of a given resource";

  public readonly subCommands: YargsCommand[] = [new ResourceShowFunction(), new ResourceShowSQL()];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });

    return yargs;
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}

export class ResourceShowFunction extends YargsCommand {
  public readonly commandHead = `azure-function`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to show configuration details of Azure Function";
  public readonly paramPath = constants.resourceShowFunctionParamPath;
  public readonly params: { [_: string]: Options } = getParamJson(this.paramPath);

  public builder(yargs: Argv): Argv<any> {
    return yargs.options(this.params);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args["folder"] || "./");
    const result = await readConfigs(rootFolder);
    const pluginName = "function";
    if (result.isOk()) {
      if (pluginName in result.value) {
        console.log(JSON.stringify(result.value[pluginName]));
      }
      return ok(null);
    } else {
      return err(result.error);
    }
  }
}

export class ResourceShowSQL extends YargsCommand {
  public readonly commandHead = `azure-sql`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to show configuration details of SQL";
  public readonly paramPath = constants.resourceShowSQLParamPath;
  public readonly params: { [_: string]: Options } = getParamJson(this.paramPath);

  public builder(yargs: Argv): Argv<any> {
    return yargs.options(this.params);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args["folder"] || "./");
    const result = await readConfigs(rootFolder);
    const pluginName = "azure-sql";
    if (result.isOk()) {
      if (pluginName in result.value) {
        console.log(result.value[pluginName]);
      }
      return ok(null);
    } else {
      return err(result.error);
    }
  }
}
export class ResourceList extends YargsCommand {
  public readonly commandHead = `list`;
  public readonly command = `${this.commandHead} [options]`;
  public readonly description = "A command to list all resources add to the application";
  public readonly paramPath = constants.resourceListParamPath;
  public readonly params: { [_: string]: Options } = getParamJson(this.paramPath);

  public builder(yargs: Argv): Argv<any> {
    return yargs.options(this.params);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args["folder"] || "./");
    const result = await readConfigs(rootFolder);
    let pluginNameMap: Map<string, string> = new Map();
    pluginNameMap.set("azure-sql", "azure-sql");
    pluginNameMap.set("function", "azure-function");

    if (result.isOk()) {
      pluginNameMap.forEach((pluginAlias: string, pluginName: string) => {
        if (pluginName in result.value) {
          console.log(pluginAlias);
        }
      });
      return ok(null);
    } else {
      return err(result.error);
    }
  }
}

export default class Resource extends YargsCommand {
  public readonly commandHead = `resource`;
  public readonly command = `${this.commandHead} <action> [options]`;
  public readonly description = "Operate the resource";

  public readonly subCommands: YargsCommand[] = [
    new ResourceAdd(),
    new ResourceConfigure(),
    new ResourceShow(),
    new ResourceList()
  ];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs.version(false);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}
