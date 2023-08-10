// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Colors,
  IQTreeNode,
  Inputs,
  MultiSelectQuestion,
  OptionItem,
  Platform,
  QTreeNode,
  Question,
  SingleSelectQuestion,
} from "@microsoft/teamsfx-api";
import { getSingleOption, sampleProvider } from "@microsoft/teamsfx-core";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import * as uuid from "uuid";
import { parse } from "yaml";
import { Options } from "yargs";
import { teamsAppFileName } from "./constants";
import CLIUIInstance from "./userInteraction";

function getChoicesFromQTNodeQuestion(data: Question): string[] | undefined {
  const option = "staticOptions" in data ? data.staticOptions : undefined;
  if (option && option instanceof Array && option.length > 0) {
    if (typeof option[0] === "string") {
      return option as string[];
    } else {
      return (option as OptionItem[]).map((op) => op.cliName || toLocaleLowerCase(op.id));
    }
  } else {
    return undefined;
  }
}

export function getSingleOptionString(
  q: SingleSelectQuestion | MultiSelectQuestion
): string | string[] {
  const singleOption = getSingleOption(q);
  if (q.returnObject) {
    if (q.type === "singleSelect") {
      return typeof singleOption === "string" ? singleOption : singleOption.id;
    } else {
      return [singleOption[0].id];
    }
  } else {
    return singleOption;
  }
}

export async function toYargsOptions(data: Question): Promise<Options> {
  const choices = getChoicesFromQTNodeQuestion(data);
  let defaultValue = data.default;
  if (typeof data.default === "function") {
    defaultValue = await data.default({ platform: Platform.CLI_HELP });
  }
  let title: any = data.title;
  if (typeof data.title === "function") {
    title = await data.title({ platform: Platform.CLI_HELP });
  }

  if (defaultValue && defaultValue instanceof Array && defaultValue.length > 0) {
    defaultValue = defaultValue.map((item) => item.toLocaleLowerCase());
  } else if (defaultValue && typeof defaultValue === "string") {
    defaultValue = defaultValue.toLocaleLowerCase();
  } else {
    defaultValue = undefined;
  }

  if (defaultValue === undefined) {
    return {
      array: data.type === "multiSelect",
      description: title || "",
      choices: choices,
      hidden: !!(data as any).hide,
      global: false,
      type: "string",
    };
  }
  return {
    array: data.type === "multiSelect",
    description: title || "",
    default: defaultValue,
    choices: choices,
    hidden: !!(data as any).hide,
    global: false,
    type: "string",
  };
}

export function toLocaleLowerCase(arg: any): any {
  if (typeof arg === "string") {
    return arg.toLocaleLowerCase();
  } else if (arg instanceof Array) {
    return arg.map((s: string) => s.toLocaleLowerCase());
  } else return arg;
}

export function flattenNodes(node: IQTreeNode): IQTreeNode[] {
  const nodeCopy = Object.assign({}, node);
  const children = (nodeCopy.children || []).concat([]);
  nodeCopy.children = undefined;
  return [nodeCopy].concat(...children.map((nd) => flattenNodes(nd)));
}

export function isWorkspaceSupported(workspace: string): boolean {
  const p = workspace;

  const checklist = [p, path.join(p, teamsAppFileName)];

  for (const fp of checklist) {
    if (!fs.existsSync(path.resolve(fp))) {
      return false;
    }
  }
  return true;
}

// Only used for telemetry
export function getSettingsVersion(rootFolder: string | undefined): string | undefined {
  if (!rootFolder) {
    return undefined;
  }
  if (isWorkspaceSupported(rootFolder)) {
    const filePath = path.join(rootFolder, teamsAppFileName);
    if (!fs.existsSync(filePath)) {
      return undefined;
    }

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const configuration = parse(fileContent);
      return configuration.version;
    } catch (e) {
      return undefined;
    }
  }
  return undefined;
}

export function getSystemInputs(projectPath?: string, env?: string): Inputs {
  const systemInputs: Inputs = {
    platform: Platform.CLI,
    projectPath: projectPath,
    correlationId: uuid.v4(),
    env: env,
    nonInteractive: !CLIUIInstance.interactive,
  };
  return systemInputs;
}

export function getColorizedString(message: Array<{ content: string; color: Colors }>): string {
  // Color support is automatically detected by chalk
  const colorizedMessage = message
    .map((item) => {
      switch (item.color) {
        case Colors.BRIGHT_WHITE:
          return chalk.whiteBright(item.content);
        case Colors.WHITE:
          return chalk.white(item.content);
        case Colors.BRIGHT_MAGENTA:
          return chalk.magentaBright(item.content);
        case Colors.BRIGHT_GREEN:
          return chalk.greenBright(item.content);
        case Colors.BRIGHT_RED:
          return chalk.redBright(item.content);
        case Colors.BRIGHT_YELLOW:
          return chalk.yellowBright(item.content);
        case Colors.BRIGHT_CYAN:
          return chalk.cyanBright.underline(item.content);
        default:
          return item.content;
      }
    })
    .join("");
  return colorizedMessage + (process.stdout.isTTY ? "\u00A0\u001B[K" : "");
}

/**
 * Shows in `teamsfx -v`.
 * @returns the version of teamsfx-cli.
 */
export function getVersion(): string {
  const pkgPath = path.resolve(__dirname, "..", "package.json");
  const pkgContent = fs.readJsonSync(pkgPath);
  return pkgContent.version;
}

export async function getTemplates(): Promise<
  {
    tags: string[];
    title: string;
    description: string;
    sampleAppName: string;
    sampleAppUrl?: string;
  }[]
> {
  await sampleProvider.fetchSampleConfig();
  const samples = sampleProvider.SampleCollection.samples.map((sample) => {
    return {
      tags: sample.tags,
      title: sample.title,
      description: sample.shortDescription,
      sampleAppName: sample.id,
      sampleAppUrl: sample.downloadUrl,
    };
  });
  return samples;
}
