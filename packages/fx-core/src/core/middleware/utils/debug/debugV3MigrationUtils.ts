// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import { CommentArray, CommentJSONValue, CommentObject, assign, parse } from "comment-json";
import { FileType, namingConverterV3 } from "../MigrationUtils";
import { MigrationContext } from "../migrationContext";
import { readBicepContent } from "../v3MigrationUtils";
import { SettingsFolderName } from "@microsoft/teamsfx-api";
import * as dotenv from "dotenv";
import * as os from "os";
import * as path from "path";

export async function readJsonCommentFile(filepath: string): Promise<CommentJSONValue | undefined> {
  if (await fs.pathExists(filepath)) {
    const content = await fs.readFile(filepath);
    const data = parse(content.toString());
    return data;
  }
}

export function isCommentObject(data: CommentJSONValue | undefined): data is CommentObject {
  return typeof data === "object" && !Array.isArray(data) && !!data;
}

export function isCommentArray(
  data: CommentJSONValue | undefined
): data is CommentArray<CommentJSONValue> {
  return Array.isArray(data);
}

export interface DebugPlaceholderMapping {
  tabDomain?: string;
  tabEndpoint?: string;
  tabIndexPath?: string;
  botDomain?: string;
  botEndpoint?: string;
}

export async function getPlaceholderMappings(
  context: MigrationContext
): Promise<DebugPlaceholderMapping> {
  const bicepContent = await readBicepContent(context);
  const getName = (name: string) => {
    const res = namingConverterV3(name, FileType.STATE, bicepContent);
    return res.isOk() ? res.value : undefined;
  };
  return {
    tabDomain: getName("state.fx-resource-frontend-hosting.domain"),
    tabEndpoint: getName("state.fx-resource-frontend-hosting.endpoint"),
    tabIndexPath: getName("state.fx-resource-frontend-hosting.indexPath"),
    botDomain: context.isBotValidDomain
      ? getName("state.fx-resource-bot.validDomain")
      : getName("state.fx-resource-bot.domain"),
    botEndpoint: getName("state.fx-resource-bot.siteEndpoint"),
  };
}

export class OldProjectSettingsHelper {
  public static includeTab(oldProjectSettings: any): boolean {
    return this.includePlugin(oldProjectSettings, "fx-resource-frontend-hosting");
  }

  public static includeBot(oldProjectSettings: any): boolean {
    return this.includePlugin(oldProjectSettings, "fx-resource-bot");
  }

  public static includeFunction(oldProjectSettings: any): boolean {
    return this.includePlugin(oldProjectSettings, "fx-resource-function");
  }

  public static includeFuncHostedBot(oldProjectSettings: any): boolean {
    return (
      this.includePlugin(oldProjectSettings, "fx-resource-bot") &&
      ["azure-function", "azure-functions"].includes(
        oldProjectSettings.pluginSettings?.["fx-resource-bot"]?.["host-type"] ?? ""
      )
    );
  }

  public static includeSSO(oldProjectSettings: any): boolean {
    return this.includePlugin(oldProjectSettings, "fx-resource-aad-app-for-teams");
  }

  public static getFunctionName(oldProjectSettings: any): string | undefined {
    return oldProjectSettings.defaultFunctionName;
  }

  private static includePlugin(oldProjectSettings: any, pluginName: string): boolean {
    const azureSolutionSettings = oldProjectSettings.solutionSettings;
    return azureSolutionSettings.activeResourcePlugins.includes(pluginName);
  }
}

export async function updateLocalEnv(
  context: MigrationContext,
  envs: { [key: string]: string }
): Promise<void> {
  if (Object.keys(envs).length === 0) {
    return;
  }
  await context.fsEnsureDir(SettingsFolderName);
  const localEnvPath = path.join(SettingsFolderName, ".env.local");
  if (!(await context.fsPathExists(localEnvPath))) {
    await context.fsCreateFile(localEnvPath);
  }
  const existingEnvs = dotenv.parse(
    await fs.readFile(path.join(context.projectPath, localEnvPath))
  );
  const content = Object.entries({ ...existingEnvs, ...envs })
    .map(([key, value]) => `${key}=${value}`)
    .join(os.EOL);
  await context.fsWriteFile(localEnvPath, content, {
    encoding: "utf-8",
  });
}

export function generateLabel(base: string, existingLabels: string[]): string {
  let prefix = 0;
  while (true) {
    const generatedLabel = base + (prefix > 0 ? ` ${prefix.toString()}` : "");
    if (!existingLabels.includes(generatedLabel)) {
      return generatedLabel;
    }
    prefix += 1;
  }
}

export function createResourcesTask(label: string): CommentJSONValue {
  const comment = `{
    // Create the debug resources.
    // See https://aka.ms/teamsfx-tasks/provision to know the details and how to customize the args.
  }`;
  const task = {
    label,
    type: "teamsfx",
    command: "provision",
    args: {
      env: "local",
    },
  };
  return assign(parse(comment), task);
}

export function setUpLocalProjectsTask(label: string): CommentJSONValue {
  const comment = `{
    // Build project.
    // See https://aka.ms/teamsfx-tasks/deploy to know the details and how to customize the args.
  }`;
  const task = {
    label,
    type: "teamsfx",
    command: "deploy",
    args: {
      env: "local",
    },
  };
  return assign(parse(comment), task);
}

export function startFrontendTask(label: string): CommentJSONValue {
  const task = {
    label,
    type: "shell",
    command: "npx env-cmd --silent -f .localConfigs react-scripts start",
    isBackground: true,
    options: {
      cwd: "${workspaceFolder}/tabs",
    },
    problemMatcher: {
      pattern: {
        regexp: "^.*$",
        file: 0,
        location: 1,
        message: 2,
      },
      background: {
        activeOnStart: true,
        beginsPattern: ".*",
        endsPattern: "Compiled|Failed|compiled|failed",
      },
    },
  };
  return assign(parse("{}"), task);
}

export function startAuthTask(label: string): CommentJSONValue {
  const task = {
    label,
    type: "shell",
    command: "dotnet Microsoft.TeamsFx.SimpleAuth.dll",
    isBackground: true,
    options: {
      cwd: path.join(os.homedir(), ".fx", "localauth"),
      env: {
        ASPNETCORE_ENVIRONMENT: "Development",
        PATH: "${command:fx-extension.get-dotnet-path}${env:PATH}",
      },
    },
    problemMatcher: {
      pattern: [
        {
          regexp: "^.*$",
          file: 0,
          location: 1,
          message: 2,
        },
      ],
      background: {
        activeOnStart: true,
        beginsPattern: ".*",
        endsPattern: ".*",
      },
    },
  };
  return assign(parse("{}"), task);
}

export function watchBackendTask(label: string): CommentJSONValue {
  const task = {
    label,
    type: "shell",
    command: "tsc --watch",
    isBackground: true,
    options: {
      cwd: "${workspaceFolder}/api",
    },
    problemMatcher: "$tsc-watch",
    presentation: {
      reveal: "silent",
    },
  };
  return assign(parse("{}"), task);
}

export function startBackendTask(label: string, programmingLanguage?: string): CommentJSONValue {
  programmingLanguage = programmingLanguage || "javascript";
  const command = `npx env-cmd --silent -f .localConfigs func start --${programmingLanguage} --language-worker="--inspect=9229" --port "7071" --cors "*"`;
  const task = {
    label,
    type: "shell",
    command,
    isBackground: true,
    options: {
      cwd: "${workspaceFolder}/api",
      env: {
        PATH: "${command:fx-extension.get-func-path}${env:PATH}",
      },
    },
    problemMatcher: {
      pattern: {
        regexp: "^.*$",
        file: 0,
        location: 1,
        message: 2,
      },
      background: {
        activeOnStart: true,
        beginsPattern: "^.*(Job host stopped|signaling restart).*$",
        endsPattern:
          "^.*(Worker process started and initialized|Host lock lease acquired by instance ID).*$",
      },
    },
    presentation: {
      reveal: "silent",
    },
  };
  return assign(parse("{}"), task);
}

export function startBotTask(label: string, programmingLanguage?: string): CommentJSONValue {
  const command =
    programmingLanguage === "typescript"
      ? "npx env-cmd --silent -f .localConfigs nodemon --inspect=9239 --signal SIGINT -r ts-node/register index.ts"
      : "npx env-cmd --silent -f .localConfigs nodemon --inspect=9239 --signal SIGINT index.js";
  const task = {
    label,
    type: "shell",
    command,
    isBackground: true,
    options: {
      cwd: "${workspaceFolder}/bot",
    },
    problemMatcher: {
      pattern: [
        {
          regexp: "^.*$",
          file: 0,
          location: 1,
          message: 2,
        },
      ],
      background: {
        activeOnStart: true,
        beginsPattern: "[nodemon] starting",
        endsPattern: "restify listening to|Bot/ME service listening at|[nodemon] app crashed",
      },
    },
  };
  return assign(parse("{}"), task);
}

export function launchRemote(
  hubName: string,
  browserType: string,
  browserName: string,
  url: string,
  order: number
): Record<string, unknown> {
  return {
    name: `Launch Remote in ${hubName} (${browserName})`,
    type: browserType,
    request: "launch",
    url,
    presentation: {
      group: `group ${order}: ${hubName}`,
      order: 3,
    },
    internalConsoleOptions: "neverOpen",
  };
}

export const defaultFuncSymlinkDir = "./devTools/func";
export const ignoreDevToolsDir = "/devTools/";
