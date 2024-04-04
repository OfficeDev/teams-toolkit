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

class StockUpdateTestCase extends CaseFactory {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;

    const envFile = path.resolve(projectPath, "env", `.env.dev`);
    let ENDPOINT = fs.readFileSync(envFile, "utf-8");
    ENDPOINT +=
      "\nTEAMSFX_API_ALPHAVANTAGE_ENDPOINT=https://www.alphavantage.co";
    fs.writeFileSync(envFile, ENDPOINT);
    console.log(`add endpoint ${ENDPOINT} to .env.dev file`);
    const userFile = path.resolve(projectPath, "env", `.env.dev.user`);
    let KEY = fs.readFileSync(userFile, "utf-8");
    KEY += "\nTEAMSFX_API_ALPHAVANTAGE_API_KEY=demo";
    fs.writeFileSync(userFile, KEY);
    console.log(`add key ${KEY} to .env.dev.user file`);
  }
}

new StockUpdateTestCase(
  TemplateProjectFolder.StockUpdate,
  15772706,
  "qidon@microsoft.com",
  ["bot"]
).test();
