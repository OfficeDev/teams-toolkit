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
  LocalDebugError,
} from "../../utils/constants";
import { waitForTerminal } from "../../utils/vscodeOperation";
import { debugInitMap, initPage } from "../../utils/playwrightOperation";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import { it } from "../../utils/it";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../utils/nameUtil";
import {
  runProvision,
  runDeploy,
  reRunDeploy,
} from "../remotedebug/remotedebugContext";
import { AzSqlHelper } from "../../utils/azureCliHelper";
import { expect } from "chai";
import { Page } from "playwright";
import fs from "fs-extra";
import path from "path";
import { Executor } from "../../utils/executor";
import { ChildProcessWithoutNullStreams } from "child_process";
import os from "os";

const debugMap: Record<LocalDebugTaskLabel, () => Promise<void>> = {
  [LocalDebugTaskLabel.StartFrontend]: async () => {
    await waitForTerminal(
      LocalDebugTaskLabel.StartFrontend,
      LocalDebugTaskResult.FrontendSuccess
    );
  },
  [LocalDebugTaskLabel.StartBackend]: async () => {
    await waitForTerminal(
      LocalDebugTaskLabel.StartBackend,
      LocalDebugTaskResult.BotAppSuccess
    );
  },
  [LocalDebugTaskLabel.WatchBackend]: async () => {
    await waitForTerminal(
      LocalDebugTaskLabel.WatchBackend,
      LocalDebugTaskResult.CompiledSuccess
    );
  },
  [LocalDebugTaskLabel.StartLocalTunnel]: async () => {
    await waitForTerminal(
      LocalDebugTaskLabel.StartLocalTunnel,
      LocalDebugTaskResult.StartSuccess
    );
  },
  [LocalDebugTaskLabel.Azurite]: async () => {
    await waitForTerminal(
      LocalDebugTaskLabel.Azurite,
      LocalDebugTaskResult.AzuriteSuccess
    );
  },
  [LocalDebugTaskLabel.Compile]: async () => {
    await waitForTerminal(
      LocalDebugTaskLabel.Compile,
      LocalDebugTaskResult.CompiledSuccess
    );
  },
  [LocalDebugTaskLabel.StartBotApp]: async () => {
    await waitForTerminal(
      LocalDebugTaskLabel.StartBotApp,
      LocalDebugTaskResult.BotAppSuccess
    );
  },
  [LocalDebugTaskLabel.StartBot]: async () => Promise.resolve(),
  [LocalDebugTaskLabel.StartWebhook]: async () => {
    await waitForTerminal(LocalDebugTaskLabel.StartWebhook);
  },
  [LocalDebugTaskLabel.InstallNpmPackages]: async () => Promise.resolve(),
  [LocalDebugTaskLabel.ApiNpmInstall]: async () => Promise.resolve(),
  [LocalDebugTaskLabel.BotNpmInstall]: async () => Promise.resolve(),
  [LocalDebugTaskLabel.TabsNpmInstall]: async () => Promise.resolve(),
  [LocalDebugTaskLabel.SpfxNpmInstall]: async () => Promise.resolve(),
  [LocalDebugTaskLabel.GulpServe]: async () => {
    await waitForTerminal(
      LocalDebugTaskLabel.GulpServe,
      LocalDebugTaskResult.GulpServeSuccess
    );
  },
  [LocalDebugTaskLabel.StartWebServer]: async () => {
    await waitForTerminal(
      LocalDebugTaskLabel.StartWebServer,
      LocalDebugTaskResult.WebServerSuccess
    );
  },
};

export abstract class CaseFactory {
  public sampleName: TemplateProject;
  public testPlanCaseId: number;
  public author: string;
  public env: "local" | "dev";
  public validate: LocalDebugTaskLabel[];
  public options?: {
    teamsAppName?: string;
    dashboardFlag?: boolean;
    type?: string;
    testRootFolder?: string;
    includeFunction?: boolean;
    npmName?: string;
    skipInit?: boolean;
    skipValidation?: boolean;
    debug?: "cli" | "ttk";
  };

  public constructor(
    sampleName: TemplateProject,
    testPlanCaseId: number,
    author: string,
    env: "local" | "dev",
    validate: LocalDebugTaskLabel[] = [],
    options: {
      teamsAppName?: string;
      dashboardFlag?: boolean;
      type?: string;
      testRootFolder?: string;
      includeFunction?: boolean;
      npmName?: string;
      skipInit?: boolean;
      skipValidation?: boolean;
      debug?: "cli" | "ttk";
    } = {}
  ) {
    this.sampleName = sampleName;
    this.testPlanCaseId = testPlanCaseId;
    this.author = author;
    this.env = env;
    this.validate = validate;
    this.options = options;
  }

  public onBefore(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev",
    azSqlHelper?: AzSqlHelper
  ): Promise<AzSqlHelper | undefined> {
    return Promise.resolve(undefined);
  }

  public async onAfter(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev"
  ): Promise<void> {
    const envMap: Record<
      "local" | "dev",
      (options?: { rgName: string }) => Promise<void>
    > = {
      local: async () => await sampledebugContext.after(),
      dev: async (options?: { rgName: string }) =>
        await sampledebugContext.sampleAfter(options?.rgName ?? ""),
    };
    await envMap[env]({ rgName: `${sampledebugContext.appName}-dev-rg` });
  }

  public async onAfterCreate(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev",
    azSqlHelper?: AzSqlHelper
  ): Promise<void> {
    return Promise.resolve();
  }

  public async onBeforeBrowerStart(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev",
    azSqlHelper?: AzSqlHelper
  ): Promise<void> {
    return Promise.resolve();
  }

  public async onInitPage(
    sampledebugContext: SampledebugContext,
    teamsAppId: string,
    options?: {
      teamsAppName: string;
      includeFunction: boolean;
      npmName: string;
      dashboardFlag: boolean;
      type: string;
    }
  ): Promise<Page> {
    return await initPage(
      sampledebugContext.context!,
      teamsAppId,
      Env.username,
      Env.password,
      { dashboardFlag: options?.dashboardFlag }
    );
  }

  public async onValidate(
    page: Page,
    options?: {
      context: SampledebugContext;
      displayName: string;
      includeFunction: boolean;
      npmName: string;
      env: "local" | "dev";
    }
  ): Promise<void> {
    Promise.resolve();
  }

  public test(): void {
    const {
      sampleName,
      testPlanCaseId,
      author,
      env,
      validate,
      options,
      onBefore,
      onAfterCreate,
      onAfter,
      onBeforeBrowerStart,
      onInitPage,
      onValidate,
    } = this;
    describe("Sample Tests", function () {
      this.timeout(Timeout.testAzureCase);
      let sampledebugContext: SampledebugContext;
      let azSqlHelper: AzSqlHelper | undefined;
      let devtunnelProcess: ChildProcessWithoutNullStreams;
      let debugProcess: ChildProcessWithoutNullStreams;
      let tunnelName = "";
      let successFlag = true;
      let envContent = "";
      let botFlag = false;
      let envFile = "";

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
        azSqlHelper = await onBefore(sampledebugContext, env, azSqlHelper);
      });

      afterEach(async function () {
        this.timeout(Timeout.finishAzureTestCase);
        if (debugProcess) {
          const isClose = debugProcess.kill("SIGTERM");
          await new Promise((resolve) => setTimeout(resolve, 10000));
          expect(isClose).to.be.true;
          console.log("kill debug process successfully");
        }

        if (tunnelName) {
          const isClose = devtunnelProcess.kill("SIGTERM");
          await new Promise((resolve) => setTimeout(resolve, 10000));
          expect(isClose).to.be.true;
          console.log("kill devtunnel process successfully");
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
        await onAfter(sampledebugContext, env);
        // windows in cli can't stop debug
        if (options?.debug === "cli" && os.type() === "Windows_NT") {
          if (successFlag) process.exit(0);
          else process.exit(1);
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
          try {
            // create project
            await sampledebugContext.openResourceFolder();
            // use 1st middleware to process typical sample
            await onAfterCreate(sampledebugContext, env, azSqlHelper);

            try {
              envFile = path.resolve(
                sampledebugContext.projectPath,
                "env",
                ".env.local"
              );
              envContent = fs.readFileSync(envFile, "utf-8");
              // if bot project setup devtunnel
              botFlag = envContent.includes("BOT_DOMAIN");
            } catch (error) {
              console.log("read file error", error);
            }
            const debugEnvMap: Record<"local" | "dev", () => Promise<void>> = {
              local: async () => {
                // local debug
                if (options?.debug === "cli") {
                  // cli preview
                  console.log("======= debug with cli ========");
                  console.log("botFlag: ", botFlag);
                  if (botFlag) {
                    devtunnelProcess = Executor.startDevtunnel(
                      (data) => {
                        if (data) {
                          // start devtunnel
                          const domainRegex =
                            /Connect via browser: https:\/\/(\S+)/;
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
                  await new Promise((resolve) =>
                    setTimeout(resolve, 60 * 1000)
                  );
                  {
                    const { success } = await Executor.provision(
                      sampledebugContext.projectPath,
                      "local"
                    );
                    expect(success).to.be.true;
                  }
                  {
                    const { success } = await Executor.deploy(
                      sampledebugContext.projectPath,
                      "local"
                    );
                    expect(success).to.be.true;
                  }
                  debugProcess = Executor.debugProject(
                    sampledebugContext.projectPath,
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
                  await new Promise((resolve) =>
                    setTimeout(resolve, 2 * 30 * 1000)
                  );
                } else {
                  console.log("======= debug with ttk ========");
                  await debugInitMap[sampleName]();
                  for (const label of validate) {
                    try {
                      await debugMap[label]();
                    } catch (error) {
                      const errorMsg = error.toString();
                      if (
                        // skip can't find element
                        errorMsg.includes(
                          LocalDebugError.ElementNotInteractableError
                        ) ||
                        // skip timeout
                        errorMsg.includes(LocalDebugError.TimeoutError)
                      ) {
                        console.log("[skip error] ", error);
                      } else {
                        expect.fail(errorMsg);
                      }
                    }
                  }
                }
              },
              dev: async () => {
                await runProvision(
                  sampledebugContext.appName,
                  env,
                  false,
                  options?.type === "spfx"
                );
                try {
                  await runDeploy(Timeout.tabDeploy, options?.type === "spfx");
                } catch (error) {
                  await reRunDeploy(Timeout.tabDeploy);
                }
              },
            };

            if (options?.skipInit) {
              console.log("skip ui skipInit...");
              console.log("debug finish!");
              return;
            }
            await debugEnvMap[env]();

            const teamsAppId = await sampledebugContext.getTeamsAppId(env);
            expect(teamsAppId).to.not.be.empty;

            // use 2nd middleware to process typical sample
            await onBeforeBrowerStart(sampledebugContext, env, azSqlHelper);

            // init
            const page = await onInitPage(sampledebugContext, teamsAppId, {
              includeFunction: options?.includeFunction ?? false,
              npmName: options?.npmName ?? "",
              dashboardFlag: options?.dashboardFlag ?? false,
              type: options?.type ?? "",
              teamsAppName: options?.teamsAppName ?? "",
            });

            if (options?.skipValidation) {
              console.log("skip ui skipValidation...");
              console.log("debug finish!");
              return;
            }
            // validate
            await onValidate(page, {
              context: sampledebugContext,
              displayName: Env.displayName,
              includeFunction: options?.includeFunction ?? false,
              npmName: options?.npmName ?? "",
              env: env,
            });
          } catch (error) {
            successFlag = false;
            await VSBrowser.instance.takeScreenshot(getScreenshotName("error"));
            console.log("[Error]: ", error);
            await VSBrowser.instance.driver.sleep(
              Timeout.playwrightDefaultTimeout
            );
          }
          expect(successFlag).to.be.true;
          console.log("debug finish!");
        }
      );
    });
  }
}
