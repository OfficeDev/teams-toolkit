// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Timeout,
  TemplateProject,
  TemplateProjectFolder,
  LocalDebugTaskResult,
} from "../../utils/constants";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import { LocalDebugTaskLabel } from "../../utils/constants";
import {
  initPage,
  validateProactiveMessaging,
} from "../../utils/playwrightOperation";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import { it } from "../../utils/it";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../utils/nameUtil";

describe("Sample Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let sampledebugContext: SampledebugContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    sampledebugContext = new SampledebugContext(
      TemplateProject.ProactiveMessaging,
      TemplateProjectFolder.ProactiveMessaging,
      "./resource/samples"
    );
    await sampledebugContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishAzureTestCase);
    await sampledebugContext.after();
  });

  it(
    "[auto] local debug for Sample Proactive Messaging",
    {
      testPlanCaseId: 17303781,
      author: "v-ivanchen@microsoft.com",
    },
    async function () {
      // create project
      await sampledebugContext.openResourceFolder();
      // await sampledebugContext.createTemplate();

      try {
        // local debug
        await startDebugging();

        console.log("Start Local Tunnel");
        await waitForTerminal(
          LocalDebugTaskLabel.StartLocalTunnel,
          LocalDebugTaskResult.StartSuccess
        );

        console.log("wait for bot Started");
        await waitForTerminal(
          LocalDebugTaskLabel.StartBot,
          LocalDebugTaskResult.AppSuccess
        );
      } catch (error) {
        await VSBrowser.instance.takeScreenshot(getScreenshotName("debug"));
        console.log("[Skip Error]: ", error);
        await VSBrowser.instance.driver.sleep(Timeout.playwrightDefaultTimeout);
      }

      const teamsAppId = await sampledebugContext.getTeamsAppId("local");
      console.log(teamsAppId);
      const page = await initPage(
        sampledebugContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      // await validateProactiveMessaging(page);
      console.log("debug finish!");
    }
  );
});
