// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Xiaofu Huang <xiaofu.huang@microsoft.com>
 */
import * as path from "path";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import { initPage, validateEchoBot } from "../../utils/playwrightOperation";
import { LocalDebugTestContext } from "./localdebugContext";
import {
  Timeout,
  LocalDebugTaskLabel,
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
import fs from "fs-extra";
import os from "os";

describe("Local Debug Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;
  let devtunnelProcess: ChildProcessWithoutNullStreams;
  let debugProcess: ChildProcessWithoutNullStreams;
  let debugMethod: "cli" | "ttk";
  let botFlag = false;
  let tunnelName = "";
  let envContent = "";
  let envFile = "";
  let successFlag = true;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("bot");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    if (debugProcess) {
      setTimeout(() => {
        debugProcess.kill("SIGINT");
      }, 2000);
    }

    if (tunnelName) {
      setTimeout(() => {
        devtunnelProcess.kill("SIGINT");
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
    "[auto] Local debug Bot App",
    {
      testPlanCaseId: 11042961,
      author: "xiaofu.huang@microsoft.com",
    },
    async function () {
      try {
        const projectPath = path.resolve(
          localDebugTestContext.testRootFolder,
          localDebugTestContext.appName
        );
        validateFileExist(projectPath, "index.js");

        // local debug
        try {
          envFile = path.resolve(projectPath, "env", ".env.local");
          envContent = fs.readFileSync(envFile, "utf-8");
          // if bot project setup devtunnel
          botFlag = envContent.includes("BOT_DOMAIN");
        } catch (error) {
          console.log("read file error", error);
        }
        debugMethod = ["cli", "ttk"][0] as "cli" | "ttk";
        if (debugMethod === "cli") {
          // cli preview
          console.log("======= debug with cli ========");
          if (botFlag) {
            devtunnelProcess = Executor.startDevtunnel(
              (data) => {
                if (data) {
                  // start devtunnel
                  const domainRegex = /Connect via browser: https:\/\/(\S+)/;
                  const endpointRegex = /Connect via browser: (\S+)/;
                  const tunnelNameRegex =
                    /Ready to accept connections for tunnel: (\S+)/;
                  console.log(data);
                  const domainFound = data.match(domainRegex);
                  const endpointFound = data.match(endpointRegex);
                  const tunnelNameFound = data.match(tunnelNameRegex);
                  if (domainFound && endpointFound) {
                    if (domainFound[1] && endpointFound[1]) {
                      const domain = domainFound[1];
                      const endpoint = endpointFound[1];
                      try {
                        console.log(endpoint);
                        console.log(tunnelName);
                        envContent += `\nBOT_ENDPOINT=${endpoint}`;
                        envContent += `\nBOT_DOMAIN=${domain}`;
                        envContent += `\nBOT_FUNCTION_ENDPOINT=${endpoint}`;
                        fs.writeFileSync(envFile, envContent);
                      } catch (error) {
                        console.log(error);
                      }
                    }
                  }
                  if (tunnelNameFound) {
                    if (tunnelNameFound[1]) {
                      tunnelName = tunnelNameFound[1];
                    }
                  }
                }
              },
              (error) => {
                console.log(error);
              }
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
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
          await waitForTerminal(LocalDebugTaskLabel.StartLocalTunnel);
          await waitForTerminal(LocalDebugTaskLabel.StartBotApp, "Bot started");
        }

        const teamsAppId = await localDebugTestContext.getTeamsAppId();
        expect(teamsAppId).to.not.be.empty;
        const page = await initPage(
          localDebugTestContext.context!,
          teamsAppId,
          Env.username,
          Env.password
        );
        await localDebugTestContext.validateLocalStateForBot();
        await validateEchoBot(page);
      } catch (error) {
        successFlag = false;
        await VSBrowser.instance.takeScreenshot(getScreenshotName("error"));
        console.log("[Error]: ", error);
        await VSBrowser.instance.driver.sleep(Timeout.playwrightDefaultTimeout);
      }
    }
  );
});
