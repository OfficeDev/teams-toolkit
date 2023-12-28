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
import { AzSqlHelper } from "../../utils/azureCliHelper";
import { SampledebugContext } from "./sampledebugContext";
import * as path from "path";
import * as fs from "fs";

class BotSSOTestCase extends CaseFactory {
  public override async onAfterCreate(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev"
  ): Promise<void> {
    const envFile = path.resolve(
      sampledebugContext.projectPath,
      "env",
      `.env.${env}`
    );
    let ENDPOINT = fs.readFileSync(envFile, "utf-8");
    ENDPOINT += "\nSERVICE_BUS_QUEUE_NAME=test-service-bus";
    fs.writeFileSync(envFile, ENDPOINT);
    console.log(`add endpoint ${ENDPOINT} to .env.${env} file`);
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
  { skipInit: true, debug: ["cli", "ttk"][Date.now() % 2] as "cli" | "ttk" }
).test();
