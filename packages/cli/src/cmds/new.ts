// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import AdmZip from "adm-zip";
import axios from "axios";
import colors from "colors";
import fs from "fs-extra";
import path from "path";
import { Argv, Options } from "yargs";

import {
  FxError,
  err,
  ok,
  Result,
  Stage,
  Platform,
  ConfigMap,
  QTreeNode,
  NodeType,
  Question,
  isAutoSkipSelect,
  SingleSelectQuestion,
  MultiSelectQuestion,
} from "@microsoft/teamsfx-api";

import activate from "../activate";
import * as constants from "../constants";
import { NotFoundInputedFolder, SampleAppDownloadFailed } from "../error";
import { validateAndUpdateAnswers, visitInteractively } from "../question/question";
import { YargsCommand } from "../yargsCommand";
import {
  flattenNodes,
  getJson,
  getSingleOptionString,
  toConfigMap,
  toYargsOptions,
} from "../utils";
import CliTelemetry from "../telemetry/cliTelemetry";
import { TelemetryClient } from "applicationinsights";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";

export default class New extends YargsCommand {
  public readonly commandHead = `new`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Create a new Teams application.";
  public readonly paramPath = constants.newParamPath;

  public readonly root = getJson<QTreeNode>(this.paramPath);
  public params: { [_: string]: Options } = {};
  public answers: ConfigMap = new ConfigMap();

  public readonly subCommands: YargsCommand[] = [new NewTemplete()];

  public builder(yargs: Argv): Argv<any> {
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    if (this.root) {
      const nodes = flattenNodes(JSON.parse(JSON.stringify(this.root)));
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
          data.default = getSingleOptionString(data as SingleSelectQuestion | MultiSelectQuestion);
          (data as any).hide = true;
        }
        this.params[data.name] = toYargsOptions(data);
      });
      yargs
        .options({
          interactive: {
            description: "Select the options interactively",
            boolean: true,
            default: true,
            global: false,
          },
        })
        .options(this.params);
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

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.CreateProjectStart);
    const result = await activate();
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CreateProject, result.error);
      return err(result.error);
    }

    const core = result.value;
    {
      const result = await core.getQuestions!(Stage.create, Platform.CLI);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CreateProject, result.error);
        return err(result.error);
      }
      await validateAndUpdateAnswers(result.value!, this.answers);
    }

    {
      const result = await core.create(this.answers);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CreateProject, result.error);
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.CreateProject, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
    return ok(null);
  }
}

class NewTemplete extends YargsCommand {
  public readonly commandHead = `template`;
  public readonly command = `${this.commandHead} <template-name>`;
  public readonly description = "Create an app from an existing template.";

  public readonly subCommands: YargsCommand[] = [new NewTempleteList()];

  public builder(yargs: Argv): Argv<any> {
    const RootFolderNodeData = constants.RootFolderNode.data as Question;
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    const templatesNames = constants.templates.map((t) => t.sampleAppName);
    yargs
      .positional("template-name", {
        description: "Enter the template name",
        type: "string",
        choices: templatesNames,
        default: templatesNames[0],
      })
      .options(RootFolderNodeData.name, {
        type: "string",
        description: RootFolderNodeData.description,
        default: RootFolderNodeData.default,
      });
    return yargs;
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const folder = path.resolve((args.folder as string) || "./");
    if (!fs.pathExistsSync(folder)) {
      throw NotFoundInputedFolder(folder);
    }
    CliTelemetry.sendTelemetryEvent(TelemetryEvent.DownloadSampleStart);
    const templateName = args["template-name"] as string;
    const template = constants.templates.find((t) => t.sampleAppName === templateName)!;

    const result = await this.fetchCodeZip(template.sampleAppUrl);
    await this.saveFilesRecursively(new AdmZip(result.data), template.sampleAppName, folder);
    console.log(
      colors.green(
        `Downloaded the '${colors.yellow(template.sampleAppName)}' sample to '${colors.yellow(
          path.join(folder, template.sampleAppName)
        )}'.`
      )
    );

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.DownloadSample, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      [TelemetryProperty.SampleName]: templateName,
    });
    return ok(null);
  }

  private async fetchCodeZip(url: string) {
    try {
      const result = await axios.get(url, {
        responseType: "arraybuffer",
      });
      if (result.status === 200 || result.status === 201) {
        return result;
      }
      throw SampleAppDownloadFailed(url, new Error(result.statusText));
    } catch (e) {
      throw SampleAppDownloadFailed(url, e);
    }
  }

  private async saveFilesRecursively(
    zip: AdmZip,
    appFolder: string,
    dstPath: string
  ): Promise<void> {
    await Promise.all(
      zip
        .getEntries()
        .filter((entry) => !entry.isDirectory && entry.entryName.includes(appFolder))
        .map(async (entry) => {
          const data = entry.getData().toString();
          const entryPath = entry.entryName.substring(entry.entryName.indexOf("/") + 1);
          const filePath = path.join(dstPath, entryPath);
          await fs.ensureDir(path.dirname(filePath));
          await fs.writeFile(filePath, data);
        })
    );
  }
}

class NewTempleteList extends YargsCommand {
  public readonly commandHead = `list`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "List all templates";

  public builder(yargs: Argv): Argv<any> {
    return yargs.hide("template-name");
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    console.log(colors.green(`The following are sample apps:`));
    console.log(constants.templates);
    console.log(
      colors.green(
        `Use the command ${colors.yellow(
          "teamsfx new template <sampleAppName>"
        )} to create an application from the sample app.`
      )
    );
    return ok(null);
  }
}
