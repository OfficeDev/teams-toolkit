// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import AdmZip from "adm-zip";
import axios from "axios";
import fs from "fs-extra";
import path from "path";
import { Argv, Options } from "yargs";
import * as uuid from "uuid";
import { glob } from "glob";

import { FxError, err, ok, Result, Question, LogLevel, Stage } from "@microsoft/teamsfx-api";

import activate from "../activate";
import * as constants from "../constants";
import { NotFoundInputedFolder, SampleAppDownloadFailed, ProjectFolderExist } from "../error";
import { YargsCommand } from "../yargsCommand";
import { getSystemInputs, toLocaleLowerCase } from "../utils";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import CLIUIInstance from "../userInteraction";
import CLILogProvider from "../commonlib/log";
import HelpParamGenerator from "../helpParamGenerator";

export default class New extends YargsCommand {
  public readonly commandHead = `new`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Create a new Teams application.";
  public params: { [_: string]: Options } = {};

  public readonly subCommands: YargsCommand[] = [new NewTemplete()];

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp(Stage.create);
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    if (this.params) {
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
    CliTelemetry.sendTelemetryEvent(TelemetryEvent.CreateProjectStart);

    if (!args.interactive) {
      CLIUIInstance.updatePresetAnswers(this.params, args);
    }

    const result = await activate();
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CreateProject, result.error);
      return err(result.error);
    }

    const core = result.value;

    {
      const result = await core.createProject(getSystemInputs());
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
        coerce: toLocaleLowerCase,
      })
      .options(RootFolderNodeData.name, {
        type: "string",
        description: RootFolderNodeData.type != "func" ? RootFolderNodeData.title : "unknown",
        default: RootFolderNodeData.default,
      });
    return yargs;
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const folder = path.resolve((args.folder as string) || "./");
    if (!fs.pathExistsSync(folder)) {
      CliTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.DownloadSample,
        NotFoundInputedFolder(folder)
      );
      return err(NotFoundInputedFolder(folder));
    }
    CliTelemetry.sendTelemetryEvent(TelemetryEvent.DownloadSampleStart);
    const templateName = args["template-name"] as string;
    const template = constants.templates.find((t) => t.sampleAppName === templateName)!;

    const sampleAppFolder = path.resolve(folder, template.sampleAppName);
    if ((await fs.pathExists(sampleAppFolder)) && (await fs.readdir(sampleAppFolder)).length > 0) {
      CliTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.DownloadSample,
        ProjectFolderExist(sampleAppFolder)
      );
      return err(ProjectFolderExist(sampleAppFolder));
    }

    const result = await this.fetchCodeZip(template.sampleAppUrl);
    await this.saveFilesRecursively(new AdmZip(result.data), template.sampleAppName, folder);
    await this.downloadSampleHook(templateName, sampleAppFolder);
    CLILogProvider.necessaryLog(
      LogLevel.Info,
      `Downloaded the '${CLILogProvider.white(
        template.sampleAppName
      )}' sample to '${CLILogProvider.white(sampleAppFolder)}'.`
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
          const entryPath = entry.entryName.substring(entry.entryName.indexOf("/") + 1);
          const filePath = path.join(dstPath, entryPath);
          await fs.ensureDir(path.dirname(filePath));
          await fs.writeFile(filePath, entry.getData());
        })
    );
  }

  private async downloadSampleHook(sampleId: string, sampleAppPath: string) {
    // A temporary solution to avoid duplicate componentId
    if (sampleId === "todo-list-SPFx") {
      const originalId = "c314487b-f51c-474d-823e-a2c3ec82b1ff";
      const componentId = uuid.v4();
      glob.glob(`${sampleAppPath}/**/*.json`, { nodir: true, dot: true }, async (err, files) => {
        await Promise.all(
          files.map(async (file) => {
            let content = (await fs.readFile(file)).toString();
            const reg = new RegExp(originalId, "g");
            content = content.replace(reg, componentId);
            await fs.writeFile(file, content);
          })
        );
      });
    }
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
    CLILogProvider.necessaryLog(LogLevel.Info, `The following are sample apps:`);
    CLILogProvider.necessaryLog(
      LogLevel.Info,
      JSON.stringify(constants.templates, undefined, 4),
      true
    );
    CLILogProvider.necessaryLog(
      LogLevel.Info,
      `Use the command ${CLILogProvider.white(
        "teamsfx new template <sampleAppName>"
      )} to create an application from the sample app.`
    );
    return ok(null);
  }
}
