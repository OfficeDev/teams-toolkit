// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Colors,
  FxError,
  Inputs,
  MultiSelectQuestion,
  OptionItem,
  Platform,
  QTreeNode,
  Question,
  Result,
  SingleSelectQuestion,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import * as uuid from "uuid";
import { parse } from "yaml";
import { Options } from "yargs";
import { FeatureFlags, cliSource, teamsAppFileName } from "./constants";
import { ReadFileError } from "./error";
import CLIUIInstance from "./userInteraction";
import { FileNotFoundError, getSingleOption } from "@microsoft/teamsfx-core";

export type Json = { [_: string]: any };

export function getChoicesFromQTNodeQuestion(data: Question): string[] | undefined {
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

export function toYargsOptions(data: Question): Options {
  const choices = getChoicesFromQTNodeQuestion(data);

  let defaultValue;
  if (data.default && data.default instanceof Array && data.default.length > 0) {
    defaultValue = data.default.map((item) => item.toLocaleLowerCase());
  } else if (data.default && typeof data.default === "string") {
    defaultValue = data.default.toLocaleLowerCase();
  } else {
    defaultValue = undefined;
  }
  if (defaultValue === undefined) {
    return {
      array: data.type === "multiSelect",
      description: (data.title as string) || "",
      choices: choices,
      hidden: !!(data as any).hide,
      global: false,
      type: "string",
    };
  }
  return {
    array: data.type === "multiSelect",
    description: (data.title as string) || "",
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

export function flattenNodes(node: QTreeNode): QTreeNode[] {
  const nodeCopy = Object.assign({}, node);
  const children = (nodeCopy.children || []).concat([]);
  nodeCopy.children = undefined;
  return [nodeCopy].concat(...children.map((nd) => flattenNodes(nd)));
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getSettingsFilePath(projectFolder: string) {
  return path.join(projectFolder, teamsAppFileName);
}

export function readSettingsFileSync(projectFolder: string): Result<Json, FxError> {
  const filePath = getSettingsFilePath(projectFolder);
  if (!fs.existsSync(filePath)) {
    return err(new FileNotFoundError(cliSource, filePath));
  }

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const configuration = parse(fileContent);
    return ok({
      projectId: configuration.projectId,
      version: configuration.version,
    });
  } catch (e) {
    return err(ReadFileError(e));
  }
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

export interface TeamsAppTelemetryInfo {
  appId: string;
  tenantId: string;
}

export function getTeamsAppTelemetryInfoByEnv(
  projectDir: string,
  env: string
): TeamsAppTelemetryInfo | undefined {
  try {
    if (isWorkspaceSupported(projectDir)) {
      const result = environmentManager.getEnvStateFilesPath(env, projectDir);
      const envJson = JSON.parse(fs.readFileSync(result.envState, "utf8"));
      const appstudioState = envJson["fx-resource-appstudio"];
      return {
        appId: appstudioState.teamsAppId,
        tenantId: appstudioState.tenantId,
      };
    }
  } catch (e) {
    return undefined;
  }
}

// Only used for telemetry
export function getSettingsVersion(rootFolder: string | undefined): string | undefined {
  if (!rootFolder) {
    return undefined;
  }
  try {
    if (isWorkspaceSupported(rootFolder)) {
      const result = readSettingsFileSync(rootFolder);
      if (result.isOk()) {
        return result.value.version;
      }
    }
  } catch (e) {
    // ignore errors for telemetry
  }
  return undefined;
}

// Only used for telemetry
export function getIsM365(rootFolder: string | undefined): string | undefined {
  if (!rootFolder) {
    return undefined;
  }
  try {
    if (isWorkspaceSupported(rootFolder)) {
      const result = readSettingsFileSync(rootFolder);
      if (result.isOk() && result.value.isM365 !== undefined) {
        return `${result.value.isM365}`;
      }
    }
  } catch (e) {
    // ignore errors for telemetry
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

export function argsToInputs(
  params: { [_: string]: Options },
  args: { [argName: string]: string | string[] }
): Inputs {
  const inputs = getSystemInputs();
  for (const name in params) {
    if (name.endsWith("folder") && args[name]) {
      inputs[name] = path.resolve(args[name] as string);
    } else {
      inputs[name] = args[name];
    }
  }
  const rootFolder = path.resolve((inputs["folder"] as string) || "./");
  delete inputs["folder"];
  inputs.projectPath = rootFolder;
  return inputs;
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

// Determine whether feature flag is enabled based on environment variable setting
export function isFeatureFlagEnabled(featureFlagName: string, defaultValue = false): boolean {
  const flag = process.env[featureFlagName];
  if (flag === undefined) {
    return defaultValue; // allows consumer to set a default value when environment variable not set
  } else {
    return flag === "1" || flag.toLowerCase() === "true"; // can enable feature flag by set environment variable value to "1" or "true"
  }
}

export function isRemoteCollaborationEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlags.InsiderPreview, true);
}

export function getAllFeatureFlags(): string[] | undefined {
  const result = Object.values(FeatureFlags)
    .filter((featureFlag) => {
      return isFeatureFlagEnabled(featureFlag);
    })
    .map((featureFlag) => {
      return featureFlag;
    });

  return result;
}
