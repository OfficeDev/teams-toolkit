// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Xiaofu Huang <xiaofu.huang@microsoft.com>
 */
import * as path from "path";
import {
  startDebugging,
  waitForTerminal,
  stopDebugging,
} from "../../utils/vscodeOperation";
import { initPage, validateEchoBot } from "../../utils/playwrightOperation";
import { LocalDebugTestContext } from "./localdebugContext";
import {
  Timeout,
  LocalDebugTaskLabel,
  DebugItemSelect,
} from "../../utils/constants";
import { Env } from "../../utils/env";
import { it } from "../../utils/it";
import { killPort, validateFileExist } from "../../utils/commonUtils";
import { ChildProcessWithoutNullStreams } from "child_process";
import { Executor } from "../../utils/executor";
import { expect } from "chai";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../utils/nameUtil";
import os from "os";

describe("Local Debug Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;
  let devtunnelProcess: ChildProcessWithoutNullStreams;
  let debugProcess: ChildProcessWithoutNullStreams;
  let debugMethod: "cli" | "ttk";
  let tunnelName = "";
  let successFlag = true;
  let errorMessage = "";

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("bot", "typescript");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    if (debugProcess) {
      setTimeout(() => {
        debugProcess.kill("SIGTERM");
      }, 2000);
    }

    if (tunnelName) {
      setTimeout(() => {
        devtunnelProcess.kill("SIGTERM");
      }, 2000);
      Executor.deleteTunnel(
        tunnelName,
        (data) => {
          if (data) {
            console.log(data);
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
    await localDebugTestContext.after(false, true);
    this.timeout(Timeout.finishAzureTestCase);
    // windows in cli can't stop debug
    if (debugMethod === "cli" && os.type() === "Windows_NT") {
      if (successFlag) process.exit(0);
      else process.exit(1);
    }
  });

  it(
    "[auto] [Typescript] Local Debug for bot project",
    {
      testPlanCaseId: 9729308,
      author: "xiaofu.huang@microsoft.com",
    },
    async function () {
      try {
        const projectPath = path.resolve(
          localDebugTestContext.testRootFolder,
          localDebugTestContext.appName
        );
        validateFileExist(projectPath, "index.ts");

        const driver = VSBrowser.instance.driver;
        // local debug
        console.log("======= debug with ttk ========");
        await startDebugging(DebugItemSelect.DebugInTeamsUsingChrome);
        await waitForTerminal(LocalDebugTaskLabel.StartLocalTunnel);
        await waitForTerminal(LocalDebugTaskLabel.StartBotApp, "Bot Started");

        const teamsAppId = await localDebugTestContext.getTeamsAppId();
        expect(teamsAppId).to.not.be.empty;
        {
          const page = await initPage(
            localDebugTestContext.context!,
            teamsAppId,
            Env.username,
            Env.password
          );
          await localDebugTestContext.validateLocalStateForBot();
          await validateEchoBot(page);
        }
        await stopDebugging();
        await driver.sleep(Timeout.stopdebugging);
        try {
          await killPort(3978);
          console.log(`close port 3978 successfully`);
        } catch (error) {
          console.log(`close port 3978 failed`);
        }

        // cli preview
        console.log("======= debug with cli ========");
        const tunnel = Executor.debugBotFunctionPreparation(projectPath);
        tunnelName = tunnel.tunnelName;
        devtunnelProcess = tunnel.devtunnelProcess;
        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
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
        await new Promise((resolve) => setTimeout(resolve, 5 * 30 * 1000));
        {
          const page = await initPage(
            localDebugTestContext.context!,
            teamsAppId,
            Env.username,
            Env.password
          );
          await localDebugTestContext.validateLocalStateForBot();
          await validateEchoBot(page);
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
