// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { SampledebugContext } from "../../samples/sampledebugContext";
import {
  Timeout,
  TemplateProject,
  Notification,
  TemplateProjectFolder,
  LocalDebugTaskLabel,
  LocalDebugTaskResult,
} from "../../../utils/constants";
import { it } from "../../../utils/it";
import {
  validateNotification,
  validateUpgrade,
  upgradeByTreeView,
  startDebugging,
  waitForTerminal,
} from "../../../utils/vscodeOperation";
import { initTeamsPage } from "../../../utils/playwrightOperation";
import { Env } from "../../../utils/env";
import { CliHelper } from "../../cliHelper";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../../utils/nameUtil";

describe("Migration Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let sampledebugContext: SampledebugContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    sampledebugContext = new SampledebugContext(
      TemplateProject.MyFirstMetting,
      TemplateProjectFolder.MyFirstMetting
    );
    await sampledebugContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await sampledebugContext.after(true, false, "local");
  });

  it(
    "[auto] sample hello world meeting V2 to V3 upgrade test",
    {
      testPlanCaseId: 17184043,
      author: "v-ivanchen@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      await sampledebugContext.createTemplateCLI(false);
      // verify popup

      await validateNotification(Notification.Upgrade);

      // local debug
      await sampledebugContext.debugWithCLI("local");

      // upgrade
      await upgradeByTreeView();
      //verify upgrade
      await validateUpgrade();
      // enable cli v3
      CliHelper.setV3Enable();

      try {
        // local debug
        await startDebugging();

        console.log("wait frontend start");
        await waitForTerminal(
          LocalDebugTaskLabel.StartFrontend,
          LocalDebugTaskResult.FrontendSuccess
        );
      } catch (error) {
        await VSBrowser.instance.takeScreenshot(getScreenshotName("debug"));
        console.log("[Skip Error]: ", error);
        await VSBrowser.instance.driver.sleep(Timeout.playwrightDefaultTimeout);
      }

      const teamsAppId = await sampledebugContext.getTeamsAppId("local");
      console.log(teamsAppId);
      const page = await initTeamsPage(
        sampledebugContext.context!,
        teamsAppId,
        Env.username,
        Env.password,
        {
          teamsAppName: "hello-world-in-meeting-local",
          type: "meeting",
        }
      );
      console.log("debug finish!");
    }
  );
});
