// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { MigrationTestContext } from "../migrationContext";
import { Timeout, Capability, Notification } from "../../../utils/constants";
import { it } from "../../../utils/it";
import { Env } from "../../../utils/env";
import {
  initPage,
  validateTabNoneSSO,
} from "../../../utils/playwrightOperation";
import {
  validateNotification,
  validateUpgrade,
  upgradeByCommandPalette,
} from "../../../utils/vscodeOperation";
import * as dotenv from "dotenv";
import { runProvision, runDeploy } from "../../remotedebug/remotedebugContext";
import { CliHelper } from "../../cliHelper";

dotenv.config();

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
    await mirgationDebugTestContext.after(false, false, "dev");
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

      // v3 provision
      await runProvision(mirgationDebugTestContext.appName);
      await runDeploy(Timeout.botDeploy);

      // UI verify
      const teamsAppId = await mirgationDebugTestContext.getTeamsAppId("dev");
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
