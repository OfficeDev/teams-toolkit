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
import { initPage, validateQueryOrg } from "../../../utils/playwrightOperation";
import { Env } from "../../../utils/env";
import { CLIVersionCheck } from "../../../utils/commonUtils";

describe("Migration Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let sampledebugContext: SampledebugContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    sampledebugContext = new SampledebugContext(
      TemplateProject.QueryOrg,
      TemplateProjectFolder.QueryOrg
    );
    await sampledebugContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await sampledebugContext.after(true, true, "dev");
  });

  it(
    "[auto] [P1] V2 org user search connector sample upgrade",
    {
      testPlanCaseId: 17183850,
      author: "v-annefu@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      await sampledebugContext.createTemplateCLI(false);
      // verify popup
      await validateNotification(Notification.Upgrade);

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

      // v3 provision
      await sampledebugContext.provisionWithCLI("dev", true);
      await CLIVersionCheck("V3", sampledebugContext.projectPath);
      // v3 deploy
      await sampledebugContext.deployWithCLI("dev");

      const teamsAppId = await sampledebugContext.getTeamsAppId("dev");
      console.log(teamsAppId);
      const page = await initPage(
        sampledebugContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await validateQueryOrg(page, { displayName: Env.displayName });
      console.log("debug finish!");
    }
  );
});
