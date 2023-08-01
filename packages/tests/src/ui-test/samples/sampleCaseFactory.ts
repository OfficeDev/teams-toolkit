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
  validateAdaptiveCard,
} from "../../utils/playwrightOperation";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import { it } from "../../utils/it";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../utils/nameUtil";
import { runProvision, runDeploy } from "../remotedebug/remotedebugContext";

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
          await sampledebugContext.after();
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

            if (env === "local") {
              try {
                // local debug
                await startDebugging();

                if (validate.includes(LocalDebugTaskLabel.StartLocalTunnel)) {
                  console.log("Start Local Tunnel");
                  await waitForTerminal(
                    LocalDebugTaskLabel.StartLocalTunnel,
                    LocalDebugTaskResult.StartSuccess
                  );
                }

                if (validate.includes(LocalDebugTaskLabel.Azurite)) {
                  console.log("wait for Azurite service Started");
                  await waitForTerminal(
                    LocalDebugTaskLabel.Azurite,
                    LocalDebugTaskResult.AzuriteSuccess
                  );
                }

                if (validate.includes(LocalDebugTaskLabel.Compile)) {
                  console.log("Compile...");
                  await waitForTerminal(
                    LocalDebugTaskLabel.Compile,
                    LocalDebugTaskResult.CompiledSuccess
                  );
                }

                if (validate.includes(LocalDebugTaskLabel.StartBotApp)) {
                  console.log("wait for application Started");
                  await waitForTerminal(
                    LocalDebugTaskLabel.StartBotApp,
                    LocalDebugTaskResult.BotAppSuccess
                  );
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
            const page = await initPage(
              sampledebugContext.context!,
              teamsAppId,
              Env.username,
              Env.password
            );
            if (sampleName === TemplateProject.AdaptiveCard) {
              await validateAdaptiveCard(sampledebugContext, page);
            }
            console.log("debug finish!");
          }
        );
      });
    },
  };
}
