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
} from "../../../utils/constants";
import { it } from "../../../utils/it";
import { CliHelper } from "../../cliHelper";
import {
  validateNotification,
  validateUpgrade,
  upgradeByTreeView,
} from "../../../utils/vscodeOperation";
import { initPage, validateBot } from "../../../utils/playwrightOperation";
import { Env } from "../../../utils/env";
import { updateDeverloperInManifestFile } from "../../../utils/commonUtils";
import { updatePakcageJson } from "./helper";
import * as path from "path";
import {
  deployProject,
  provisionProject,
} from "../../remotedebug/remotedebugContext";

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
    await sampledebugContext.after(true, true, "dev");
  });

  it(
    "[auto] V4.0.0 sample bot sso V2 to V3 upgrade test",
    {
      testPlanCaseId: 17431834,
      author: "v-ivanchen@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      await sampledebugContext.openResourceFolder();
      // verify popup
      await validateNotification(Notification.Upgrade);

      updatePakcageJson(
        path.join(sampledebugContext.projectPath, "bot", "package.json")
      );

      // upgrade
      await upgradeByTreeView();
      //verify upgrade
      await validateUpgrade();

      // install test cil in project
      await CliHelper.installCLI(
        Env.TARGET_CLI,
        false,
        sampledebugContext.projectPath
      );
      CliHelper.setV3Enable();

      await updateDeverloperInManifestFile(sampledebugContext.projectPath);

      // v3 provision
      await provisionProject(
        sampledebugContext.appName,
        sampledebugContext.projectPath
      );
      await deployProject(sampledebugContext.projectPath);

      const teamsAppId = await sampledebugContext.getTeamsAppId("dev");
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
