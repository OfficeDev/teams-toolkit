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
  execCommandIfExist,
} from "../../../utils/vscodeOperation";
import * as dotenv from "dotenv";
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

    //Close the folder and cleanup local sample project
    await execCommandIfExist("Workspaces: Close Workspace", Timeout.webView);
    console.log(
      `[Successfully] start to clean up for ${mirgationDebugTestContext.projectPath}`
    );
    await mirgationDebugTestContext.cleanUp(
      mirgationDebugTestContext.appName,
      mirgationDebugTestContext.projectPath,
      true,
      false,
      false
    );
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
      await mirgationDebugTestContext.provisionProject(
        mirgationDebugTestContext.appName,
        mirgationDebugTestContext.projectPath
      );
      await mirgationDebugTestContext.deployProject(
        mirgationDebugTestContext.projectPath,
        Timeout.botDeploy
      );

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
