// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";
import { Executor } from "../../utils/executor";
import * as fs from "fs-extra";
import * as path from "path";
import { expect } from "chai";

class ChefBotTestCase extends CaseFactory {
  public override async onCreate(
    appName: string,
    testFolder: string,
    sampleName: TemplateProjectFolder
  ): Promise<void> {
    await Executor.openTemplateProject(
      appName,
      testFolder,
      sampleName,
      undefined,
      "js/samples/04.ai-apps"
    );
  }
  public override async onAfterCreate(projectPath: string): Promise<void> {
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;
    fs.mkdirSync(path.resolve(projectPath, "env"), {
      recursive: true,
    });
    const userFile = path.resolve(projectPath, "env", ".env.dev");
    const KEY = "SECRET_OPENAI_KEY=MY_OPENAI_API_KEY";
    fs.writeFileSync(userFile, KEY);
    console.log(`add key ${KEY} to .env.dev file`);
  }
}

new ChefBotTestCase(
  TemplateProjectFolder.ChefBot,
  25227103,
  "ning.tang@microsoft.com"
).test();
