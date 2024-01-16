// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Xiaofu Huang <xiaofu.huang@microsoft.com>
 */
import * as path from "path";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import {
  initPage,
  validateBasicTab,
  reopenPage,
} from "../../utils/playwrightOperation";
import { LocalDebugTestContext } from "./localdebugContext";
import {
  Timeout,
  LocalDebugTaskLabel,
  ValidationContent,
  DebugItemSelect,
} from "../../utils/constants";
import { Env } from "../../utils/env";
import { it } from "../../utils/it";
import { validateFileExist } from "../../utils/commonUtils";
import { ChildProcessWithoutNullStreams } from "child_process";
import { Executor } from "../../utils/executor";
import { expect } from "chai";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../utils/nameUtil";

describe("Local Debug Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;
  let debugProcess: ChildProcessWithoutNullStreams;
  let debugMethod: "cli" | "ttk";
  let successFlag = true;
  let errorMessage = "";

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("tabnsso", "typescript");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    if (debugProcess) {
      setTimeout(() => {
        debugProcess.kill("SIGTERM");
      }, 2000);
    }

    await localDebugTestContext.after(false, true);
    this.timeout(Timeout.finishAzureTestCase);
    if (successFlag) process.exit(0);
    else process.exit(1);
  });

  it(
    "[auto] [Typescript] Local Debug for Tab project without sso",
    {
      testPlanCaseId: 15276946,
      author: "xiaofu.huang@microsoft.com",
    },
    async () => {
      try {
        const projectPath = path.resolve(
          localDebugTestContext.testRootFolder,
          localDebugTestContext.appName
        );
        validateFileExist(projectPath, "src/app.ts");

        console.log("======= debug with ttk ========");
        await startDebugging(DebugItemSelect.DebugInTeamsUsingChrome);
        await waitForTerminal(
          LocalDebugTaskLabel.StartApplication,
          "restify listening to"
        );

        const teamsAppId = await localDebugTestContext.getTeamsAppId();
        expect(teamsAppId).to.not.be.empty;
        {
          const page = await initPage(
            localDebugTestContext.context!,
            teamsAppId,
            Env.username,
            Env.password
          );
          await validateBasicTab(page, ValidationContent.Tab);
        }

        // cli preview
        console.log("======= debug with cli ========");
        debugProcess = Executor.debugProject(
          projectPath,
          "local",
          true,
          process.env,
          (data) => {
            if (data) {
              console.log(data);
            }
          },
          (error) => {
            console.log(error);
          }
        );
        await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000));
        {
          const page = await reopenPage(
            localDebugTestContext.context!,
            teamsAppId,
            Env.username,
            Env.password
          );
          await localDebugTestContext.validateLocalStateForBot();
          await validateBasicTab(page, ValidationContent.Tab);
        }
      } catch (error) {
        successFlag = false;
        errorMessage = "[Error]: " + error;
        await VSBrowser.instance.takeScreenshot(getScreenshotName("error"));
        await VSBrowser.instance.driver.sleep(Timeout.playwrightDefaultTimeout);
      }
      expect(successFlag, errorMessage).to.true;
      console.log("debug finish!");
    }
  );
});
