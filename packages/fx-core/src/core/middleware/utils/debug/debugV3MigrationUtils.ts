// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import { CommentArray, CommentJSONValue, CommentObject, assign, parse } from "comment-json";
import { FileType, namingConverterV3 } from "../MigrationUtils";
import { MigrationContext } from "../migrationContext";
import { readBicepContent } from "../v3MigrationUtils";
import { AzureSolutionSettings, ProjectSettings } from "@microsoft/teamsfx-api";

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

  public static includeFuncHostedBot(oldProjectSettings: ProjectSettings): boolean {
    return (
      this.includePlugin(oldProjectSettings, "fx-resource-bot") &&
      oldProjectSettings.pluginSettings?.["fx-resource-bot"]?.["host-type"] === "azure-function"
    );
  }

  public static getFunctionName(oldProjectSettings: ProjectSettings): string | undefined {
    return oldProjectSettings.defaultFunctionName;
  }

  private static includePlugin(oldProjectSettings: ProjectSettings, pluginName: string): boolean {
    const azureSolutionSettings = oldProjectSettings.solutionSettings as AzureSolutionSettings;
    return azureSolutionSettings.activeResourcePlugins.includes(pluginName);
  }
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
