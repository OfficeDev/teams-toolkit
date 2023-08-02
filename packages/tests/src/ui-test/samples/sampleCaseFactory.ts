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
import { Page } from "playwright";
import { AzSqlHelper } from "../../utils/azureCliHelper";

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
          if (sampleName === TemplateProject.ShareNow) {
            // create sql db server
            rgName = `${sampledebugContext.appName}-dev-rg`;
            const sqlCommands = [
              `CREATE TABLE [TeamPostEntity](
                                [PostID] [int] PRIMARY KEY IDENTITY,
                                [ContentUrl] [nvarchar](400) NOT NULL,
                                [CreatedByName] [nvarchar](50) NOT NULL,
                                [CreatedDate] [datetime] NOT NULL,
                                [Description] [nvarchar](500) NOT NULL,
                                [IsRemoved] [bit] NOT NULL,
                                [Tags] [nvarchar](100) NULL,
                                [Title] [nvarchar](100) NOT NULL,
                                [TotalVotes] [int] NOT NULL,
                                [Type] [int] NOT NULL,
                                [UpdatedDate] [datetime] NOT NULL,
                                [UserID] [uniqueidentifier] NOT NULL
                            );`,
              `CREATE TABLE [UserVoteEntity](
                                [VoteID] [int] PRIMARY KEY IDENTITY,
                                [PostID] [int] NOT NULL,
                                [UserID] [uniqueidentifier] NOT NULL
                            );`,
            ];
            azSqlHelper = new AzSqlHelper(rgName, sqlCommands);
          }
          if (sampleName === TemplateProject.TodoListBackend) {
            // create sql db server
            rgName = `${sampledebugContext.appName}-dev-rg`;
            const sqlCommands = [
              `CREATE TABLE Todo
                            (
                                id INT IDENTITY PRIMARY KEY,
                                description NVARCHAR(128) NOT NULL,
                                objectId NVARCHAR(36),
                                channelOrChatId NVARCHAR(128),
                                isCompleted TinyInt NOT NULL default 0,
                            )`,
            ];
            azSqlHelper = new AzSqlHelper(rgName, sqlCommands);
          }
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
              false
            );

            if (env === "local") {
              try {
                // local debug
                await debugInitMap[sampleName]();

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
                    case LocalDebugTaskLabel.GulpServe:
                      console.log("wait gulp serve start");
                      await waitForTerminal(
                        LocalDebugTaskLabel.GulpServe,
                        LocalDebugTaskResult.GulpServeSuccess
                      );
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
            console.log(teamsAppId);

            // use 2nd middleware to process typical sample
            await middleWareMap[sampleName](
              sampledebugContext,
              env,
              azSqlHelper,
              true
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
