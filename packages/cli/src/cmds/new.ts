// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CreateProjectResult,
  FxError,
  LogLevel,
  Question,
  Result,
  Stage,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import path from "path";
import * as uuid from "uuid";
import { Argv } from "yargs";
import activate from "../activate";
import CLILogProvider from "../commonlib/log";
import * as constants from "../constants";
import { filterQTreeNode, toYargsOptionsGroup } from "../questionUtils";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { flattenNodes, getSystemInputs, getTemplates, toLocaleLowerCase } from "../utils";
import { YargsCommand } from "../yargsCommand";
import { FileNotFoundError } from "@microsoft/teamsfx-core";

export default class New extends YargsCommand {
  public readonly commandHead = `new`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Create a new Teams application.";

  public readonly subCommands: YargsCommand[] = [new NewTemplate()];

  public async builder(yargs: Argv): Promise<Argv<any>> {
    const result = await activate();
    if (result.isErr()) {
      throw result.error;
    }
    const core = result.value;
    {
      const result = await core.getQuestions(Stage.create, constants.CLIHelpInputs);
      if (result.isErr()) {
        throw result.error;
      }
      const node = result.value ?? constants.EmptyQTreeNode;
      const filteredNode = await filterQTreeNode(node, "scratch", "yes");
      const nodes = flattenNodes(filteredNode).concat(constants.RootFolderNode);
      this.params = await toYargsOptionsGroup(nodes);
    }
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs.version(false).options(this.params);
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    CliTelemetry.sendTelemetryEvent(TelemetryEvent.CreateProjectStart);

    const result = await activate();
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CreateProject, result.error);
      return err(result.error);
    }

    const core = result.value;

    const inputs = getSystemInputs();
    inputs.projectId = inputs.projectId ?? uuid.v4();
    {
      const result = await core.createProject(inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CreateProject, result.error, {
          [TelemetryProperty.IsCreatingM365]: inputs.isM365 + "",
        });
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.CreateProject, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      [TelemetryProperty.NewProjectId]: inputs.projectId,
      [TelemetryProperty.IsCreatingM365]: inputs.isM365 + "",
    });
    return ok(null);
  }
}

class NewTemplate extends YargsCommand {
  public readonly commandHead = `template`;
  public readonly command = `${this.commandHead} <template-name>`;
  public readonly description = "Create an app from an existing template.";

  public readonly subCommands: YargsCommand[] = [new NewTemplateList()];

  public async builder(yargs: Argv): Promise<Argv<any>> {
    const RootFolderNodeData = constants.RootFolderNode.data as Question;
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    const templatesNames = (await getTemplates()).map((t) => toLocaleLowerCase(t.sampleAppName));
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
        description: RootFolderNodeData.title as string,
        default: RootFolderNodeData.default,
      });
    return yargs;
  }

  public async runCommand(args: {
    [argName: string]: string | string[];
  }): Promise<Result<null, FxError>> {
    const folder = path.resolve((args.folder as string) || "./");
    if (!fs.pathExistsSync(folder)) {
      const error = new FileNotFoundError(constants.cliSource, folder);
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.DownloadSample, error);
      return err(error);
    }
    CliTelemetry.sendTelemetryEvent(TelemetryEvent.DownloadSampleStart);

    const activeRes = await activate();
    if (activeRes.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.DownloadSample, activeRes.error);
      return err(activeRes.error);
    }

    const core = activeRes.value;

    const hitTempaltes = (await getTemplates()).filter(
      (t) => t.sampleAppName.toLocaleLowerCase() === args["template-name"]
    );
    const templateName = hitTempaltes[0].sampleAppName;
    const inputs = getSystemInputs();
    inputs["scratch"] = "no";
    const properties: any = {
      [TelemetryProperty.SampleName]: templateName,
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      module: "cli",
    };
    inputs["samples"] = templateName;
    inputs["folder"] = folder;
    inputs.projectId = inputs.projectId ?? uuid.v4();
    const result = await core.createSampleProject(inputs);
    if (result.isErr()) {
      properties[TelemetryProperty.Success] = TelemetrySuccess.No;
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.DownloadSample, result.error, properties);
      return err(result.error);
    }

    properties[TelemetryProperty.NewProjectId] = inputs.projectId;
    const sampleAppFolder = (result.value as CreateProjectResult).projectPath;
    CLILogProvider.necessaryLog(
      LogLevel.Info,
      `Downloaded the '${CLILogProvider.white(templateName)}' sample to '${CLILogProvider.white(
        sampleAppFolder
      )}'.`
    );

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.DownloadSample, properties);
    return ok(null);
  }
}

class NewTemplateList extends YargsCommand {
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
      JSON.stringify(await getTemplates(), undefined, 4),
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
