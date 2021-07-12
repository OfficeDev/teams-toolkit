// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";
import { SPFXQuestionNames } from "../../../../src/plugins/resource/spfx";

export class TestHelper {
  static getFakePluginContext(
    appName: string,
    testFolder: string,
    framework: string,
    webpartName?: string
  ): PluginContext {
    const pluginContext = {
      projectSettings: {
        appName: appName,
      },
      root: testFolder,
      answers: {},
    } as PluginContext;
    pluginContext.answers![SPFXQuestionNames.webpart_name] = webpartName
      ? webpartName
      : "helloworld";
    pluginContext.answers![SPFXQuestionNames.webpart_desp] = "test";
    pluginContext.answers![SPFXQuestionNames.framework_type] = framework;
    return pluginContext;
  }
}
