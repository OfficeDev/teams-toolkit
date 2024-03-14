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

class LargeScaleBotTestCase extends CaseFactory {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;

    const envFile = path.resolve(projectPath, "env", `.env.dev`);
    let ENDPOINT = fs.readFileSync(envFile, "utf-8");
    ENDPOINT += "\nSERVICE_BUS_QUEUE_NAME=test-service-bus";
    fs.writeFileSync(envFile, ENDPOINT);
    console.log(`add endpoint ${ENDPOINT} to .env.dev file`);
  }
}

new LargeScaleBotTestCase(
  TemplateProjectFolder.LargeScaleBot,
  25929126,
  "yiqingzhao@microsoft.com",
  ["bot"]
).test();
