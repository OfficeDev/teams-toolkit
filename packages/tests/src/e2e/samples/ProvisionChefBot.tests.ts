// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";
import * as fs from "fs-extra";
import * as path from "path";
import { expect } from "chai";

class ChefBotTestCase extends CaseFactory {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;

    const userFile = path.resolve(projectPath, "env", `.env.dev.user`);
    const KEY = "SECRET_OPENAI_API_KEY=MY_OPENAI_API_KEY";
    fs.writeFileSync(userFile, KEY);
    console.log(`add key ${KEY} to .env.dev.user file`);
  }
}

new ChefBotTestCase(
  TemplateProjectFolder.ChefBot,
  25227103,
  "ning.tang@microsoft.com",
  [],
  { skipValidate: true }
).test();
