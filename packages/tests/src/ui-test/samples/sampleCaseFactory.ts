// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

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
  initTeamsPage,
  sampleValidationMap,
} from "../../utils/playwrightOperation";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import { it } from "../../utils/it";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../utils/nameUtil";
import { runProvision, runDeploy } from "../remotedebug/remotedebugContext";
import { editDotEnvFile } from "../../utils/commonUtils";
import path from "path";
import { Page } from "playwright";

export default function sampleCaseFactory(
  sampleName: TemplateProject,
  sampleFolderName: TemplateProjectFolder,
  testPlanCaseId: number,
  author: string,
  env: "local" | "dev",
  validate: LocalDebugTaskLabel[] = []
) {
  const samplePath = "";
  return {
    sampleName,
    samplePath,
    test: function () {
      describe("Sample Tests", function () {
        this.timeout(Timeout.testAzureCase);
        let sampledebugContext: SampledebugContext;
        let page: Page;

        beforeEach(async function () {
          // ensure workbench is ready
          this.timeout(Timeout.prepareTestCase);
          sampledebugContext = new SampledebugContext(
            sampleName,
            sampleFolderName
          );
          await sampledebugContext.before();
        });

        afterEach(async function () {
          this.timeout(Timeout.finishAzureTestCase);
          if (env === "local") await sampledebugContext.after();
          else
            await sampledebugContext.sampleAfter(
              `${sampledebugContext.appName}-dev-rg`
            );
        });

        it(
          `[auto] ${
            env === "local" ? env : "remote"
          } debug for Sample ${sampleName}`,
          {
            testPlanCaseId,
            author,
          },
          async function () {
            // create project
            await sampledebugContext.openResourceFolder();

            if (sampleName === TemplateProject.AssistDashboard) {
              const envFilePath = path.resolve(
                sampledebugContext.projectPath,
                "env",
                `.env.${env}.user`
              );
              editDotEnvFile(
                envFilePath,
                "DEVOPS_ORGANIZATION_NAME",
                "msazure"
              );
              editDotEnvFile(
                envFilePath,
                "DEVOPS_PROJECT_NAME",
                "Microsoft Teams Extensibility"
              );
              editDotEnvFile(envFilePath, "GITHUB_REPO_NAME", "test002");
              editDotEnvFile(envFilePath, "GITHUB_REPO_OWNER", "hellyzh");
              editDotEnvFile(envFilePath, "PlANNER_GROUP_ID", "YOUR_GROUP_ID");
              editDotEnvFile(envFilePath, "PLANNER_PLAN_ID", "YOUR_PLAN_ID");
              editDotEnvFile(
                envFilePath,
                "PLANNER_BUCKET_ID",
                "YOUR_BUCKET_ID"
              );
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
            }

            if (env === "local") {
              try {
                // local debug
                if (sampleName === TemplateProject.NpmSearch) {
                  await startDebugging("Debug in Teams (Chrome)");
                } else {
                  await startDebugging();
                }

                for (const label of validate) {
                  switch (label) {
                    case LocalDebugTaskLabel.StartLocalTunnel:
                      console.log("Start Local Tunnel");
                      await waitForTerminal(
                        LocalDebugTaskLabel.StartLocalTunnel,
                        LocalDebugTaskResult.StartSuccess
                      );
                      break;
                    case LocalDebugTaskLabel.Azurite:
                      console.log("wait for Azurite service Started");
                      await waitForTerminal(
                        LocalDebugTaskLabel.Azurite,
                        LocalDebugTaskResult.AzuriteSuccess
                      );
                      break;
                    case LocalDebugTaskLabel.Compile:
                      console.log("Compile...");
                      await waitForTerminal(
                        LocalDebugTaskLabel.Compile,
                        LocalDebugTaskResult.CompiledSuccess
                      );
                      break;
                    case LocalDebugTaskLabel.StartBotApp:
                      console.log("wait for application Started");
                      await waitForTerminal(
                        LocalDebugTaskLabel.StartBotApp,
                        LocalDebugTaskResult.BotAppSuccess
                      );
                      break;
                    case LocalDebugTaskLabel.StartFrontend:
                      console.log("wait frontend start");
                      await waitForTerminal(
                        LocalDebugTaskLabel.StartFrontend,
                        LocalDebugTaskResult.FrontendSuccess
                      );
                      break;
                    case LocalDebugTaskLabel.WatchBackend:
                      console.log("watch backend");
                      await waitForTerminal(
                        LocalDebugTaskLabel.WatchBackend,
                        LocalDebugTaskResult.CompiledSuccess
                      );
                      break;
                    case LocalDebugTaskLabel.StartBackend:
                      console.log("wait backend start");
                      await waitForTerminal(
                        LocalDebugTaskLabel.StartBackend,
                        LocalDebugTaskResult.BotAppSuccess
                      );
                      break;
                    default:
                      break;
                  }
                }
              } catch (error) {
                await VSBrowser.instance.takeScreenshot(
                  getScreenshotName("debug")
                );
                console.log("[Skip Error]: ", error);
                await VSBrowser.instance.driver.sleep(
                  Timeout.playwrightDefaultTimeout
                );
              }
            } else {
              await runProvision(sampledebugContext.appName);
              await runDeploy();
            }

            const teamsAppId =
              (await sampledebugContext.getTeamsAppId(env)) ?? "";
            if (teamsAppId === "") {
              throw new Error(
                "teamsAppId is empty, please check if the app is start successfully"
              );
            }
            console.log(teamsAppId);

            if (sampleName === TemplateProject.MyFirstMetting) {
              page = await initTeamsPage(
                sampledebugContext.context!,
                teamsAppId,
                Env.username,
                Env.password,
                `hello-world-in-meeting-${env}`,
                "meeting"
              );
            } else {
              page = await initPage(
                sampledebugContext.context!,
                teamsAppId,
                Env.username,
                Env.password,
                sampleName.includes("Dashboard") ? true : false
              );
            }

            // validate
            if (sampleValidationMap[sampleName]) {
              await sampleValidationMap[sampleName](
                page,
                sampledebugContext,
                Env.displayName,
                true
              );
            }
            console.log("debug finish!");
          }
        );
      });
    },
  };
}
