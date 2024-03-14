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

class OutlookSignatureTestCase extends CaseFactory {
  override async onCreate(
    appName: string,
    testFolder: string,
    sampleName: TemplateProjectFolder
  ): Promise<void> {
    await Executor.openTemplateProject(
      appName,
      testFolder,
      sampleName,
      undefined,
      "Samples"
    );
  }

  public override async onAfterCreate(projectPath: string): Promise<void> {
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;
  }
}

new OutlookSignatureTestCase(
  TemplateProjectFolder.OutlookSignature,
  24132154,
  "huajiezhang@microsoft.com",
  [],
  { skipDeploy: true }
).test();
