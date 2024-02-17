// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import { validateBot } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { Env } from "../../utils/env";
import { AzServiceBusHelper } from "../../utils/azureCliHelper";
import { SampledebugContext } from "./sampledebugContext";
import * as path from "path";
import * as fs from "fs";

class BotSSOTestCase extends CaseFactory {
  public override async onAfterCreate(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev"
  ): Promise<void> {
    // create service bus
    const rgName = `${sampledebugContext.appName}-dev-rg`;
    const azServiceBusHelper = new AzServiceBusHelper(rgName, "westus");

    // add service bus name into env file
    const envFile = path.resolve(
      sampledebugContext.projectPath,
      "env",
      `.env.${env}`
    );
    let envFileString = fs.readFileSync(envFile, "utf-8");
    envFileString += `\nSERVICE_BUS_QUEUE_NAME=${azServiceBusHelper.createServiceBus}`;
    fs.writeFileSync(envFile, envFileString);
    console.log(`add endpoint ${envFileString} to .env.${env} file`);

    // add connect string into local.setting.json
    const configFilePath = path.resolve(
      sampledebugContext.projectPath,
      "local.settings.json"
    );
    const configFile = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
    configFile["Values"]["SERVICE_BUS_CONNECTION_STRING"] =
      azServiceBusHelper.connectString;
    fs.writeFileSync(configFilePath, configFile);
    console.log(`update connect string to ${configFilePath} file`);
  }
}

new BotSSOTestCase(
  TemplateProject.LargeScaleBot,
  25929282,
  "v-ivanchen@microsoft.com",
  "local",
  [
    LocalDebugTaskLabel.StartLocalTunnel,
    LocalDebugTaskLabel.Compile,
    LocalDebugTaskLabel.Azurite,
    LocalDebugTaskLabel.StartApplication,
  ],
  {
    debug: "cli",
  }
).test();
