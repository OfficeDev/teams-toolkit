// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Xiaofu Huang <xiaofu.huang@microsoft.com>
 */
import * as path from "path";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import { initPage, validateBasicTab } from "../../utils/playwrightOperation";
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
import os from "os";

describe("Local Debug Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;
  let debugProcess: ChildProcessWithoutNullStreams;
  let debugMethod: "cli" | "ttk";
  let successFlag = true;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("tabnsso");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    if (debugProcess) {
      setTimeout(() => {
        debugProcess.kill("SIGKILL");
      }, 2000);
    }

    await localDebugTestContext.after(false, true);
    this.timeout(Timeout.finishAzureTestCase);
    // windows in cli can't stop debug
    // if (debugMethod === "cli" && os.type() === "Windows_NT") {
    //   if (successFlag) process.exit(0);
    //   else process.exit(1);
    // }
  });

  it(
    "[auto] [Javascript] Local Debug for Tab project without sso",
    {
      testPlanCaseId: 9426465,
      author: "xiaofu.huang@microsoft.com",
    },
    async () => {
      try {
        const projectPath = path.resolve(
          localDebugTestContext.testRootFolder,
          localDebugTestContext.appName
        );
        validateFileExist(projectPath, "src/app.js");

        // local debug
        debugMethod = ["cli", "ttk"][0] as "cli" | "ttk";
        if (debugMethod === "cli") {
          // cli preview
          console.log("======= debug with cli ========");
          {
            const { success } = await Executor.provision(projectPath, "local");
            expect(success).to.be.true;
          }
          {
            const { success } = await Executor.deploy(projectPath, "local");
            expect(success).to.be.true;
          }
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
          await new Promise((resolve) => setTimeout(resolve, 2 * 30 * 1000));
        } else {
          console.log("======= debug with ttk ========");
          await startDebugging(DebugItemSelect.DebugInTeamsUsingChrome);
          await waitForTerminal(
            LocalDebugTaskLabel.StartApplication,
            "restify listening to"
          );
        }

        const teamsAppId = await localDebugTestContext.getTeamsAppId();
        expect(teamsAppId).to.not.be.empty;
        const page = await initPage(
          localDebugTestContext.context!,
          teamsAppId,
          Env.username,
          Env.password
        );
        await validateBasicTab(page, ValidationContent.Tab);
      } catch (error) {
        successFlag = false;
        await VSBrowser.instance.takeScreenshot(getScreenshotName("error"));
        console.log("[Error]: ", error);
        await VSBrowser.instance.driver.sleep(Timeout.playwrightDefaultTimeout);
      }
    }
  );
});
