// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { MigrationTestContext } from "../migrationContext";
import {
  Timeout,
  Capability,
  Notification,
  LocalDebugTaskLabel,
  ResourceToDeploy,
  LocalDebugTaskResult,
} from "../../../utils/constants";
import { it } from "../../../utils/it";
import { Env } from "../../../utils/env";
import { validateTab, initPage } from "../../../utils/playwrightOperation";
import { CliHelper } from "../../cliHelper";
import {
  validateNotification,
  startDebugging,
  upgradeByTreeView,
  waitForTerminal,
  validateUpgrade,
} from "../../../utils/vscodeOperation";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../../utils/nameUtil";
import { updateFunctionAuthorizationPolicy } from "../../../utils/commonUtils";

describe("Migration Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let mirgationDebugTestContext: MigrationTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    mirgationDebugTestContext = new MigrationTestContext(
      Capability.Tab,
      "javascript"
    );
    await mirgationDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await mirgationDebugTestContext.after(true, true, "local");
  });

  it(
    "[auto] V2 tab, function app with sso migrate test - js",
    {
      testPlanCaseId: 17184045,
      author: "frankqian@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      const projectPath = await mirgationDebugTestContext.createProjectCLI(
        false
      );
      // verify popup
      await validateNotification(Notification.Upgrade);

      // add feature
      await mirgationDebugTestContext.addFeatureV2(ResourceToDeploy.Function);

      await updateFunctionAuthorizationPolicy("4.2.5", projectPath);

      // local debug
      await mirgationDebugTestContext.debugWithCLI("local", false);

      // upgrade
      await upgradeByTreeView();
      //verify upgrade
      await validateUpgrade();
      // enable cli v3
      CliHelper.setV3Enable();

      // local debug with TTK
      try {
        await startDebugging("Debug (Chrome)");
        console.log("wait frontend start");
        await waitForTerminal(
          LocalDebugTaskLabel.StartFrontend,
          LocalDebugTaskResult.FrontendSuccess
        );

        console.log("wait backend start");
        await waitForTerminal(
          LocalDebugTaskLabel.StartBackend,
          LocalDebugTaskResult.BotAppSuccess
        );
      } catch (error) {
        await VSBrowser.instance.takeScreenshot(getScreenshotName("debug"));
        console.log("[Skip Error]: ", error);
        await VSBrowser.instance.driver.sleep(Timeout.playwrightDefaultTimeout);
      }
      const teamsAppId = await mirgationDebugTestContext.getTeamsAppId("local");

      // UI verify
      const page = await initPage(
        mirgationDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await validateTab(page, {
        displayName: Env.displayName,
        includeFunction: true,
      });
    }
  );
});
