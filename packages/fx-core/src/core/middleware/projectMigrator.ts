// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, LogProvider } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import os from "os";
import path from "path";
import "../../component/registerService";
import { environmentManager } from "../environment";

import { getLocalizedString } from "../../common/localizeUtils";
import { CoreHookContext } from "../types";

export const learnMoreText = getLocalizedString("core.option.learnMore");
export const upgradeButton = getLocalizedString("core.option.upgrade");
const parameterFileNameTemplate = "azure.parameters.@envName.json";

const gitignoreFileName = ".gitignore";

// append folder path to .gitignore under the project root.
export async function addPathToGitignore(
  projectPath: string,
  ignoredPath: string,
  log: LogProvider
): Promise<void> {
  const relativePath = path.relative(projectPath, ignoredPath).replace(/\\/g, "/");
  await addItemToGitignore(projectPath, relativePath, log);
}

// append item to .gitignore under the project root.
async function addItemToGitignore(
  projectPath: string,
  item: string,
  log: LogProvider
): Promise<void> {
  const gitignorePath = path.join(projectPath, gitignoreFileName);
  try {
    await fs.ensureFile(gitignorePath);

    const gitignoreContent = await fs.readFile(gitignorePath, "UTF-8");
    if (gitignoreContent.indexOf(item) === -1) {
      const appendedContent = os.EOL + item;
      await fs.appendFile(gitignorePath, appendedContent);
    }
  } catch {
    log.warning(`[core] Failed to add '${item}' to '${gitignorePath}', please do it manually.`);
  }
}

export async function needMigrateToArmAndMultiEnv(ctx: CoreHookContext): Promise<boolean> {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    return false;
  }
  const fxExist = await fs.pathExists(path.join(inputs.projectPath as string, ".fx"));
  if (!fxExist) {
    return false;
  }
  const parameterEnvFileName = parameterFileNameTemplate.replace(
    "@envName",
    environmentManager.getDefaultEnvName()
  );
  const envFileExist = await fs.pathExists(
    path.join(inputs.projectPath as string, ".fx", "env.default.json")
  );
  const configDirExist = await fs.pathExists(
    path.join(inputs.projectPath as string, ".fx", "configs")
  );
  const armParameterExist = await fs.pathExists(
    path.join(inputs.projectPath as string, ".fx", "configs", parameterEnvFileName)
  );
  if (envFileExist && (!armParameterExist || !configDirExist)) {
    return true;
  }
  return false;
}
