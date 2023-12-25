// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { MigrationTestContext } from "../migrationContext";
import {
  Timeout,
  Capability,
  Notification,
  LocalDebugTaskLabel,
  CliVersion,
} from "../../../utils/constants";
import { it } from "../../../utils/it";
import { Env } from "../../../utils/env";
import {
  initPage,
  validateTabNoneSSO,
} from "../../../utils/playwrightOperation";
import {
  validateNotification,
  startDebugging,
  waitForTerminal,
  validateUpgrade,
  upgradeByCommandPalette,
} from "../../../utils/vscodeOperation";
import { CliHelper } from "../../cliHelper";

describe("Migration Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let mirgationDebugTestContext: MigrationTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    mirgationDebugTestContext = new MigrationTestContext(
      Capability.TabNonSso,
      "javascript"
    );
    await mirgationDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await mirgationDebugTestContext.after(false, false, "local");
  });

  it(
    "[auto] Basic Tab app with sso migrate test - js",
    {
      testPlanCaseId: 17184119,
      author: "v-helzha@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      await mirgationDebugTestContext.createProjectCLI(false);
      // verify popup
      try {
        await validateNotification(Notification.Upgrade);
      } catch (error) {
        await validateNotification(Notification.Upgrade_dicarded);
      }

      // upgrade
      await upgradeByCommandPalette();
      // verify upgrade
      await validateUpgrade();
      // enable cli v3
      CliHelper.setV3Enable();

      // local debug with TTK
      try {
        await startDebugging("Debug (Chrome)");
        await waitForTerminal(
          LocalDebugTaskLabel.StartFrontend,
          "Compiled successfully!"
        );
      } catch (error) {}
      const teamsAppId = await mirgationDebugTestContext.getTeamsAppId();

      // UI verify
      const page = await initPage(
        mirgationDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await validateTabNoneSSO(page);
    }
  );
});
