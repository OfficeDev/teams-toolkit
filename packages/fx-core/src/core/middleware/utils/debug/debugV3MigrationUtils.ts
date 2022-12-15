// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import { CommentArray, CommentJSONValue, CommentObject, assign, parse } from "comment-json";
import { FileType, namingConverterV3 } from "../MigrationUtils";
import { MigrationContext } from "../migrationContext";
import { readBicepContent } from "../v3MigrationUtils";
import { AzureSolutionSettings, ProjectSettings, SettingsFolderName } from "@microsoft/teamsfx-api";
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
    botDomain: getName("state.fx-resource-bot.domain"),
    botEndpoint: getName("state.fx-resource-bot.siteEndpoint"),
  };
}

export class OldProjectSettingsHelper {
  public static includeTab(oldProjectSettings: ProjectSettings): boolean {
    return this.includePlugin(oldProjectSettings, "fx-resource-frontend-hosting");
  }

  public static includeBot(oldProjectSettings: ProjectSettings): boolean {
    return this.includePlugin(oldProjectSettings, "fx-resource-bot");
  }

  public static includeFunction(oldProjectSettings: ProjectSettings): boolean {
    return this.includePlugin(oldProjectSettings, "fx-resource-function");
  }

  public static getFunctionName(oldProjectSettings: ProjectSettings): string | undefined {
    return oldProjectSettings.defaultFunctionName;
  }

  private static includePlugin(oldProjectSettings: ProjectSettings, pluginName: string): boolean {
    const azureSolutionSettings = oldProjectSettings.solutionSettings as AzureSolutionSettings;
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
    // See https://aka.ms/teamsfx-provision-task to know the details and how to customize the args.
  }`;
  const task = {
    label,
    type: "teamsfx",
    command: "provision",
    args: {
      template: "${workspaceFolder}/teamsfx/app.local.yml",
      env: "local",
    },
  };
  return assign(parse(comment), task);
}

export function setUpLocalProjectsTask(label: string): CommentJSONValue {
  const comment = `{
    // Set up local projects.
    // See https://aka.ms/teamsfx-deploy-task to know the details and how to customize the args.
  }`;
  const task = {
    label,
    type: "teamsfx",
    command: "deploy",
    args: {
      template: "${workspaceFolder}/teamsfx/app.local.yml",
      env: "local",
    },
  };
  return assign(parse(comment), task);
}
