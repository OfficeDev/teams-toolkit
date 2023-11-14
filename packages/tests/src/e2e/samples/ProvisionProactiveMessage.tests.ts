// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";
import { Executor } from "../../utils/executor";
import { setSkuNameToB1 } from "../commonUtils";

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

  override async onBeforeProvision(projectPath: string): Promise<void> {
    await setSkuNameToB1(projectPath, "templates/azure/azure.parameters.dev.json");
  }
}

new ProactiveMessagingTestCase(
  TemplateProjectFolder.ProactiveMessaging,
  15277473,
  "v-ivanchen@microsoft.com"
).test();
