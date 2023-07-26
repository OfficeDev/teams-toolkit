// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Timeout,
  TemplateProject,
  TemplateProjectFolder,
  LocalDebugTaskLabel,
  LocalDebugTaskResult,
} from "../../utils/constants";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import {
  initPage,
  validateDashboardTab,
} from "../../utils/playwrightOperation";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import { it } from "../../utils/it";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../utils/nameUtil";
import { editDotEnvFile } from "../../utils/commonUtils";
import path from "path";

describe("Sample Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let sampledebugContext: SampledebugContext;
  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    sampledebugContext = new SampledebugContext(
      TemplateProject.AssistDashboard,
      TemplateProjectFolder.AssistDashboard
    );
    await sampledebugContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishAzureTestCase);
    await sampledebugContext.after();
  });

  it(
    "[auto] local debug for Sample developer assistant Dashboard",
    {
      testPlanCaseId: 24121324,
      author: "v-ivanchen@microsoft.com",
    },
    async function () {
      // create project
      await sampledebugContext.openResourceFolder();
      // await sampledebugContext.createTemplate();

      const envFilePath = path.resolve(
        sampledebugContext.projectPath,
        "env",
        ".env.local.user"
      );
      editDotEnvFile(envFilePath, "DEVOPS_ORGANIZATION_NAME", "msazure");
      editDotEnvFile(
        envFilePath,
        "DEVOPS_PROJECT_NAME",
        "Microsoft Teams Extensibility"
      );
      editDotEnvFile(envFilePath, "GITHUB_REPO_NAME", "test002");
      editDotEnvFile(envFilePath, "GITHUB_REPO_OWNER", "hellyzh");
      editDotEnvFile(envFilePath, "PlANNER_GROUP_ID", "YOUR_GROUP_ID");
      editDotEnvFile(envFilePath, "PLANNER_PLAN_ID", "YOUR_PLAN_ID");
      editDotEnvFile(envFilePath, "PLANNER_BUCKET_ID", "YOUR_BUCKET_ID");
      editDotEnvFile(
        envFilePath,
        "SECRET_DEVOPS_ACCESS_TOKEN",
        "YOUR_DEVOPS_ACCESS_TOKEN"
      );
      editDotEnvFile(
        envFilePath,
        "SECRET_GITHUB_ACCESS_TOKEN",
        "YOUR_GITHUB_ACCESS_TOKEN"
      );

      try {
        // local debug
        await startDebugging();

        console.log("wait frontend start");
        await waitForTerminal(
          LocalDebugTaskLabel.StartFrontend,
          LocalDebugTaskResult.FrontendSuccess
        );

        console.log("watch backend");
        await waitForTerminal(
          LocalDebugTaskLabel.WatchBackend,
          LocalDebugTaskResult.CompiledSuccess
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

      const teamsAppId = await sampledebugContext.getTeamsAppId("local");
      console.log(teamsAppId);
      const page = await initPage(
        sampledebugContext.context!,
        teamsAppId,
        Env.username,
        Env.password,
        true
      );

      await validateDashboardTab(page);
      console.log("debug finish!");
    }
  );
});
