// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  CryptoProvider,
  err,
  FxError,
  Inputs,
  InputsWithProjectPath,
  Json,
  LogProvider,
  ok,
  ProjectSettings,
  Result,
  TelemetryReporter,
  v2,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as os from "os";
import { ProjectSettingsHelper } from "../../../../common/local/projectSettingsHelper";
import { LocalSettingsProvider } from "../../../../common/localSettingsProvider";
import { generateLocalDebugSettingsCommon, LocalEnvConfig } from "../../../../component/debug";
import { CommentObject } from "comment-json";
import * as commentJson from "comment-json";
import { TaskCommand } from "../../../../common/local/constants";

export async function scaffoldLocalDebugSettings(
  ctx: v2.Context,
  inputs: Inputs,
  localSettings?: Json,
  generateLocalSettingsFile = true
): Promise<Result<Json, FxError>> {
  return await _scaffoldLocalDebugSettings(
    ctx.projectSetting,
    inputs,
    ctx.telemetryReporter,
    ctx.logProvider,
    ctx.cryptoProvider,
    localSettings,
    generateLocalSettingsFile
  );
}

export async function _scaffoldLocalDebugSettings(
  projectSetting: ProjectSettings,
  inputs: Inputs,
  telemetryReporter: TelemetryReporter,
  logProvider: LogProvider,
  cryptoProvider: CryptoProvider,
  localSettings?: Json,
  generateLocalSettingsFile = true
): Promise<Result<Json, FxError>> {
  const isSpfx = ProjectSettingsHelper.isSpfx(projectSetting);
  const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSetting);
  const includeBackend = ProjectSettingsHelper.includeBackend(projectSetting);
  const includeBot = ProjectSettingsHelper.includeBot(projectSetting);
  const includeAAD = ProjectSettingsHelper.includeAAD(projectSetting);
  const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSetting);
  const includeFuncHostedBot = ProjectSettingsHelper.includeFuncHostedBot(projectSetting);
  const botCapabilities = ProjectSettingsHelper.getBotCapabilities(projectSetting);
  const programmingLanguage = projectSetting.programmingLanguage ?? "";
  const isM365 = projectSetting.isM365;
  const config: LocalEnvConfig = {
    hasAzureTab: includeFrontend,
    hasSPFxTab: isSpfx,
    hasApi: includeBackend,
    hasBot: includeBot,
    hasAAD: includeAAD,
    hasSimpleAuth: includeSimpleAuth,
    hasFunctionBot: includeFuncHostedBot,
    botCapabilities: botCapabilities,
    defaultFunctionName: projectSetting.defaultFunctionName!,
    programmingLanguage: programmingLanguage,
    isM365: isM365,
  };
  const res = await generateLocalDebugSettingsCommon(inputs as InputsWithProjectPath, config);
  if (res.isErr()) {
    return err(res.error);
  }
  return ok(localSettings as Json);
}

async function scaffoldLocalSettingsJson(
  projectSetting: ProjectSettings,
  inputs: Inputs,
  cryptoProvider: CryptoProvider,
  localSettings?: Json
): Promise<Json> {
  const localSettingsProvider = new LocalSettingsProvider(inputs.projectPath!);

  const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSetting);
  const includeBackend = ProjectSettingsHelper.includeBackend(projectSetting);
  const includeBot = ProjectSettingsHelper.includeBot(projectSetting);
  const includeAAD = ProjectSettingsHelper.includeAAD(projectSetting);
  const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSetting);

  if (localSettings !== undefined) {
    // Add local settings for the new added capability/resource
    localSettings = localSettingsProvider.incrementalInitV2(
      localSettings,
      includeBackend,
      includeBot,
      includeFrontend,
      includeAAD,
      includeSimpleAuth
    );
    await localSettingsProvider.saveJson(localSettings, cryptoProvider);
  } else {
    // Initialize a local settings on scaffolding
    localSettings = localSettingsProvider.initV2(
      includeFrontend,
      includeBackend,
      includeBot,
      includeSimpleAuth,
      includeAAD
    );
    await localSettingsProvider.saveJson(localSettings, cryptoProvider);
  }
  return localSettings;
}

export async function useNewTasks(projectPath?: string): Promise<boolean> {
  // for new project or project with "validate-local-prerequisites", use new tasks content
  const tasksJsonPath = `${projectPath}/.vscode/tasks.json`;
  if (await fs.pathExists(tasksJsonPath)) {
    try {
      const tasksContent = await fs.readFile(tasksJsonPath, "utf-8");
      return tasksContent.includes("fx-extension.validate-local-prerequisites");
    } catch (error) {
      return false;
    }
  }

  return true;
}

export async function useTransparentTasks(projectPath?: string): Promise<boolean> {
  // for new project or project with "debug-check-prerequisites", use transparent tasks content
  const tasksJsonPath = `${projectPath}/.vscode/tasks.json`;
  if (await fs.pathExists(tasksJsonPath)) {
    try {
      const tasksContent = await fs.readFile(tasksJsonPath, "utf-8");
      for (const command of Object.values(TaskCommand)) {
        if (tasksContent.includes(command)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  return true;
}

export async function updateJson(
  path: string,
  newData: Record<string, unknown>,
  mergeFunc: (
    existingData: Record<string, unknown>,
    newData: Record<string, unknown>
  ) => Record<string, unknown>
): Promise<void> {
  let finalData: Record<string, unknown>;
  if (await fs.pathExists(path)) {
    try {
      const existingData = await fs.readJSON(path);
      finalData = mergeFunc(existingData, newData);
    } catch (error) {
      // If failed to parse or edit the existing file, just overwrite completely
      finalData = newData;
    }
  } else {
    finalData = newData;
  }

  await fs.writeJSON(path, finalData, {
    spaces: 4,
    EOL: os.EOL,
  });
}

export async function updateCommentJson(
  path: string,
  newData: CommentObject,
  mergeFunc: (existingData: CommentObject, newData: CommentObject) => CommentObject
): Promise<void> {
  let finalData: Record<string, unknown>;
  if (await fs.pathExists(path)) {
    try {
      const content = await fs.readFile(path);
      const existingData = commentJson.parse(content.toString()) as CommentObject;
      finalData = mergeFunc(existingData, newData);
    } catch (error) {
      // If failed to parse or edit the existing file, just overwrite completely
      finalData = newData;
    }
  } else {
    finalData = newData;
  }

  await fs.writeFile(path, commentJson.stringify(finalData, null, 4));
}
