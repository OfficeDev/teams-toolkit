// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
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
import { initTeamsPage } from "../../../utils/playwrightOperation";
import { Env } from "../../../utils/env";
import { CLIVersionCheck } from "../../../utils/commonUtils";

describe("Migration Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let sampledebugContext: SampledebugContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    sampledebugContext = new SampledebugContext(
      TemplateProject.MyFirstMeeting,
      TemplateProjectFolder.MyFirstMeeting
    );
    await sampledebugContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await sampledebugContext.after(true, true, "dev");
  });

  it(
    "[auto] sample hello world meeting V2 to V3 upgrade test",
    {
      testPlanCaseId: 17184043,
      author: "v-ivanchen@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      await sampledebugContext.openResourceFolder();
      // verify popup
      await validateNotification(Notification.Upgrade);

      await CLIVersionCheck("V2", sampledebugContext.projectPath);
      // v2 provision
      await sampledebugContext.provisionWithCLI("dev", false);

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
      // enable cli v3
      CliHelper.setV3Enable();

      // v3 provision
      await sampledebugContext.provisionWithCLI("dev", true);
      // v3 deploy
      await CLIVersionCheck("V3", sampledebugContext.projectPath);
      await sampledebugContext.deployWithCLI("dev");

      const teamsAppId = await sampledebugContext.getTeamsAppId("dev");
      console.log(teamsAppId);
      const page = await initTeamsPage(
        sampledebugContext.context!,
        teamsAppId,
        Env.username,
        Env.password,
        {
          teamsAppName: "Hello_World_In_Meeting_App",
          type: "meeting",
        }
      );
      console.log("debug finish!");
    }
  );
});
