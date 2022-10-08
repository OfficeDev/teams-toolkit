// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Siglud
 **/

import * as fs from "fs-extra";
import * as path from "path";
import { BotValidator } from "../../commonlib";
import {
  cleanUp,
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  readContextMultiEnv,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { it } from "@microsoft/extra-shot-mocha";
import { Runtime, CliCapabilities, CliTriggerType } from "../../commonlib/constants";

export async function happyPathTest(
  runtime: Runtime,
  capabilities: CliCapabilities,
  trigger?: CliTriggerType[]
): Promise<void> {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const envName = environmentManager.getDefaultEnvName();

  const env = Object.assign({}, process.env);
  env["TEAMSFX_TEMPLATE_PRERELEASE"] = "alpha";
  if (runtime === Runtime.Dotnet) {
    env["TEAMSFX_CLI_DOTNET"] = "true";
  }

  const triggerStr = trigger === undefined ? "" : `--bot-host-type-trigger ${trigger.join(" ")} `;
  const cmdBase = `teamsfx new --interactive false --app-name ${appName} --capabilities ${capabilities} ${triggerStr}`;
  const cmd =
    runtime === Runtime.Dotnet
      ? `${cmdBase} --runtime dotnet`
      : `${cmdBase} --programming-language typescript`;
  console.log(`ready to run CMD: ${cmd}`);
  await execAsync(cmd, {
    cwd: testFolder,
    env: env,
    timeout: 0,
  });
  console.log(`[Successfully] scaffold to ${projectPath}`);

  // set subscription
  await execAsync(`teamsfx account set --subscription ${subscription}`, {
    cwd: projectPath,
    env: env,
    timeout: 0,
  });

  console.log(`[Successfully] set subscription for ${projectPath}`);

  // provision
  await execAsyncWithRetry(`teamsfx provision`, {
    cwd: projectPath,
    env: env,
    timeout: 0,
  });

  console.log(`[Successfully] provision for ${projectPath}`);

  {
    // Validate provision
    // Get context
    const context = await readContextMultiEnv(projectPath, envName);

    // Validate Bot Provision
    const bot = new BotValidator(context, projectPath, envName);
    await bot.validateProvision(false);
  }

  // deploy
  await execAsyncWithRetry(`teamsfx deploy`, {
    cwd: projectPath,
    env: env,
    timeout: 0,
  });
  console.log(`[Successfully] deploy for ${projectPath}`);

  {
    // Validate deployment

    // Get context
    const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

    // Validate Bot Deploy
    const bot = new BotValidator(context, projectPath, envName);
    await bot.validateDeploy();
  }

  // test (validate)
  await execAsyncWithRetry(`teamsfx validate`, {
    cwd: projectPath,
    env: env,
    timeout: 0,
  });

  // package
  await execAsyncWithRetry(`teamsfx package`, {
    cwd: projectPath,
    env: env,
    timeout: 0,
  });

  console.log(`[Successfully] start to clean up for ${projectPath}`);
  await cleanUp(appName, projectPath, false, true, false);
}
