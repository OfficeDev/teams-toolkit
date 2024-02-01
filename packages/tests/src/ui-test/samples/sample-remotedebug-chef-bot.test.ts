// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProject } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";
import { SampledebugContext } from "./sampledebugContext";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

class ChefBotTestCase extends CaseFactory {
  public override async onAfterCreate(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev"
  ): Promise<void> {
    const envFile = path.resolve(
      sampledebugContext.projectPath,
      "env",
      `.env.${env}`
    );
    let OPENAI_API_KEY = fs.readFileSync(envFile, "utf-8");
    OPENAI_API_KEY += "\nSECRET_OPENAI_API_KEY=yourapikey";
    fs.writeFileSync(envFile, OPENAI_API_KEY);
    console.log(`add OPENAI_API_KEY ${OPENAI_API_KEY} to .env.${env} file`);
  }
}

new ChefBotTestCase(
  TemplateProject.ChefBot,
  24409842,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  { testRootFolder: path.resolve(os.homedir(), "resourse") } // fix yarn error
).test();
