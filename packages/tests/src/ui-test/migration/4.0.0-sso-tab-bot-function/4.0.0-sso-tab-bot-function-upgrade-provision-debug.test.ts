// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { MigrationTestContext } from "../migrationContext";
import {
  Timeout,
  Capability,
  Notification,
  ResourceToDeploy,
} from "../../../utils/constants";
import { it } from "../../../utils/it";
import { Env } from "../../../utils/env";
import {
  validateProactiveMessaging,
  initPage,
} from "../../../utils/playwrightOperation";
import { CliHelper } from "../../cliHelper";
import {
  validateNotification,
  upgradeByTreeView,
  validateUpgrade,
  execCommandIfExist,
} from "../../../utils/vscodeOperation";
import {
  updateFunctionAuthorizationPolicy,
  updateDeverloperInManifestFile,
} from "../../../utils/commonUtils";
import * as path from "path";
import { updatePakcageJson } from "./helper";
import {
  deployProject,
  provisionProject,
} from "../../remotedebug/remotedebugContext";

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
    await mirgationDebugTestContext.after(true, true, "dev");

    //Close the folder and cleanup local sample project
    await execCommandIfExist("Workspaces: Close Workspace", Timeout.webView);
    console.log(
      `[Successfully] start to clean up for ${mirgationDebugTestContext.projectPath}`
    );
    await mirgationDebugTestContext.cleanUp(
      mirgationDebugTestContext.appName,
      mirgationDebugTestContext.projectPath,
      true,
      true,
      false
    );
  });

  it(
    "[auto] V4.0.0 tab, bot, function app with sso migrate test - js",
    {
      testPlanCaseId: 17431836,
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
      await mirgationDebugTestContext.addFeatureV2(ResourceToDeploy.Bot);
      await mirgationDebugTestContext.addFeatureV2(ResourceToDeploy.Function);

      updatePakcageJson(
        path.join(mirgationDebugTestContext.projectPath, "bot", "package.json")
      );

      await updateFunctionAuthorizationPolicy("4.0.0", projectPath);

      // upgrade
      await upgradeByTreeView();
      //verify upgrade
      await validateUpgrade();

      // enable cli v3
      CliHelper.setV3Enable();

      await updateDeverloperInManifestFile(
        mirgationDebugTestContext.projectPath
      );

      // v3 provision
      await provisionProject(
        mirgationDebugTestContext.appName,
        mirgationDebugTestContext.projectPath
      );
      await deployProject(mirgationDebugTestContext.projectPath);

      const teamsAppId = await mirgationDebugTestContext.getTeamsAppId("dev");
      // UI verify
      const page = await initPage(
        mirgationDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      // await validateProactiveMessaging(page);
    }
  );
});
