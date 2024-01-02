// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */
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
import { initPage, validateBot } from "../../../utils/playwrightOperation";
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
      TemplateProject.HelloWorldBotSSO,
      TemplateProjectFolder.HelloWorldBotSSO
    );
    await sampledebugContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await sampledebugContext.after(true, true, "local");
  });

  it(
    "[auto] sample bot sso V2 to V3 upgrade test",
    {
      testPlanCaseId: 17183466,
      author: "v-ivanchen@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      await sampledebugContext.openResourceFolder();
      // verify popup
      await validateNotification(Notification.Upgrade);

      // local debug
      await sampledebugContext.debugWithCLI("local", false);

      // upgrade
      await upgradeByTreeView();
      //verify upgrade
      await validateUpgrade();
      // enable cli v3
      CliHelper.setV3Enable();

      try {
        // local debug
        await startDebugging("Debug (Chrome)");

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

      const teamsAppId = await sampledebugContext.getTeamsAppId();
      console.log(teamsAppId);
      const page = await initPage(
        sampledebugContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await validateBot(page);
      console.log("debug finish!");
    }
  );
});
