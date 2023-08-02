// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import {
  Timeout,
  TemplateProject,
  sampleProjectMap,
  LocalDebugTaskLabel,
  LocalDebugTaskResult,
} from "../../utils/constants";
import { waitForTerminal } from "../../utils/vscodeOperation";
import {
  sampleInitMap,
  debugInitMap,
  sampleValidationMap,
  middleWareMap,
} from "../../utils/playwrightOperation";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import { it } from "../../utils/it";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../utils/nameUtil";
import { runProvision, runDeploy } from "../remotedebug/remotedebugContext";
import { AzSqlHelper } from "../../utils/azureCliHelper";

const debugMap: Record<LocalDebugTaskLabel, () => Promise<void>> = {
  [LocalDebugTaskLabel.StartFrontend]: async () => {
    waitForTerminal(
      LocalDebugTaskLabel.StartFrontend,
      LocalDebugTaskResult.FrontendSuccess
    );
  },
  [LocalDebugTaskLabel.StartBackend]: async () => {
    waitForTerminal(
      LocalDebugTaskLabel.StartBackend,
      LocalDebugTaskResult.BotAppSuccess
    );
  },
  [LocalDebugTaskLabel.WatchBackend]: async () => {
    waitForTerminal(
      LocalDebugTaskLabel.WatchBackend,
      LocalDebugTaskResult.CompiledSuccess
    );
  },
  [LocalDebugTaskLabel.StartLocalTunnel]: async () => {
    waitForTerminal(
      LocalDebugTaskLabel.StartLocalTunnel,
      LocalDebugTaskResult.StartSuccess
    );
  },
  [LocalDebugTaskLabel.Azurite]: async () => {
    waitForTerminal(
      LocalDebugTaskLabel.Azurite,
      LocalDebugTaskResult.AzuriteSuccess
    );
  },
  [LocalDebugTaskLabel.Compile]: async () => {
    waitForTerminal(
      LocalDebugTaskLabel.Compile,
      LocalDebugTaskResult.CompiledSuccess
    );
  },
  [LocalDebugTaskLabel.StartBotApp]: async () => {
    waitForTerminal(
      LocalDebugTaskLabel.StartBotApp,
      LocalDebugTaskResult.BotAppSuccess
    );
  },
  [LocalDebugTaskLabel.StartBot]: async () => Promise.resolve(),
  [LocalDebugTaskLabel.StartWebhook]: async () => {
    waitForTerminal(LocalDebugTaskLabel.StartWebhook);
  },
  [LocalDebugTaskLabel.InstallNpmPackages]: async () => Promise.resolve(),
  [LocalDebugTaskLabel.ApiNpmInstall]: async () => Promise.resolve(),
  [LocalDebugTaskLabel.BotNpmInstall]: async () => Promise.resolve(),
  [LocalDebugTaskLabel.TabsNpmInstall]: async () => Promise.resolve(),
  [LocalDebugTaskLabel.SpfxNpmInstall]: async () => Promise.resolve(),
  [LocalDebugTaskLabel.GulpServe]: async () => {
    waitForTerminal(
      LocalDebugTaskLabel.GulpServe,
      LocalDebugTaskResult.GulpServeSuccess
    );
  },
};

/**
 *
 * @param sampleName sample name
 * @param testPlanCaseId ado test plan case id
 * @param author email
 * @param env local or dev
 * @param validate local debug terminal jobs
 * @param options teamsAppName: teams app name, dashboardFlag: is dashboard or not, type: meeting | spfx, skipInit: whether to skip init, skipValidation: whether to skip validation
 * @returns void
 */
export default function sampleCaseFactory(
  sampleName: TemplateProject,
  testPlanCaseId: number,
  author: string,
  env: "local" | "dev",
  validate: LocalDebugTaskLabel[] = [],
  options?: {
    teamsAppName?: string;
    dashboardFlag?: boolean;
    type?: string;
    testRootFolder?: string;
    includeFunction?: boolean;
    npmName?: string;
    skipInit?: boolean;
    skipValidation?: boolean;
  }
) {
  return {
    test: function () {
      describe("Sample Tests", function () {
        this.timeout(Timeout.testAzureCase);
        let sampledebugContext: SampledebugContext;
        let azSqlHelper: AzSqlHelper;
        let rgName: string;

        beforeEach(async function () {
          // ensure workbench is ready
          this.timeout(Timeout.prepareTestCase);
          sampledebugContext = new SampledebugContext(
            sampleName,
            sampleProjectMap[sampleName],
            options?.testRootFolder ?? "./resource"
          );
          await sampledebugContext.before();
          // use before middleware to process typical sample
          azSqlHelper = (await middleWareMap[sampleName](
            sampledebugContext,
            env,
            azSqlHelper,
            { before: true }
          )) as AzSqlHelper;
        });

        afterEach(async function () {
          this.timeout(Timeout.finishAzureTestCase);
          if (env === "local") {
            if (
              sampleName === TemplateProject.ShareNow ||
              sampleName === TemplateProject.TodoListBackend
            )
              await sampledebugContext.sampleAfter(rgName);
            else await sampledebugContext.after();
          } else {
            if (
              sampleName === TemplateProject.TodoListM365 ||
              sampleName === TemplateProject.TodoListSpfx
            )
              await sampledebugContext.after();
            else
              await sampledebugContext.sampleAfter(
                `${sampledebugContext.appName}-dev-rg`
              );
          }
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

            // use 1st middleware to process typical sample
            await middleWareMap[sampleName](
              sampledebugContext,
              env,
              azSqlHelper,
              { afterCreate: true }
            );

            if (env === "local") {
              try {
                // local debug
                await debugInitMap[sampleName]();
                for (const label of validate) {
                  debugMap[label]();
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
              await runProvision(
                sampledebugContext.appName,
                env,
                false,
                options?.type === "spfx"
              );
              await runDeploy(Timeout.tabDeploy, options?.type === "spfx");
            }

            if (options?.skipInit) {
              console.log("skip ui init...");
              console.log("debug finish!");
              return;
            }

            const teamsAppId =
              (await sampledebugContext.getTeamsAppId(env)) ?? "";
            if (teamsAppId === "") {
              throw new Error(
                "teamsAppId is empty, please check if the app is start successfully"
              );
            }

            // use 2nd middleware to process typical sample
            await middleWareMap[sampleName](
              sampledebugContext,
              env,
              azSqlHelper,
              { afterdeploy: true }
            );

            // init
            const page = await sampleInitMap[sampleName](
              sampledebugContext.context!,
              teamsAppId,
              Env.username,
              Env.password,
              {
                teamsAppName: options?.teamsAppName,
                dashboardFlag: options?.dashboardFlag,
                type: options?.type,
              }
            );

            if (options?.skipValidation) {
              console.log("skip ui validation...");
              console.log("debug finish!");
              return;
            }

            // validate
            sampleValidationMap[sampleName] &&
              (await sampleValidationMap[sampleName](page!, {
                context: sampledebugContext,
                displayName: Env.displayName,
                includeFunction: options?.includeFunction,
                npmName: options?.npmName,
              }));
            console.log("debug finish!");
          }
        );
      });
    },
  };
}
