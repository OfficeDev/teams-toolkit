// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";
import { Executor } from "../../utils/executor";

class ProactiveMessagingTestCase extends CaseFactory {
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
      "samples"
    );
  }

  override async onAfterCreate(projectPath: string): Promise<void> {
    return Promise.resolve();
  }
}

new ProactiveMessagingTestCase(
  TemplateProjectFolder.ProactiveMessaging,
  15277473,
  "v-ivanchen@microsoft.com"
).test();
