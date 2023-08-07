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
import { debugInitMap, initPage } from "../../utils/playwrightOperation";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import { it } from "../../utils/it";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../utils/nameUtil";
import { runProvision, runDeploy } from "../remotedebug/remotedebugContext";
import { AzSqlHelper } from "../../utils/azureCliHelper";
import { expect } from "chai";
import { Page } from "playwright";

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
  ) {
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

  public test() {
    const {
      sampleName,
      testPlanCaseId,
      author,
      env,
      validate,
      options,
      onBefore,
      onAfter,
      onAfterCreate,
      onBeforeBrowerStart,
      onInitPage,
      onValidate,
    } = this;
    describe("Sample Tests", function () {
      this.timeout(Timeout.testAzureCase);
      let sampledebugContext: SampledebugContext;
      let azSqlHelper: AzSqlHelper | undefined;
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
        azSqlHelper = await onBefore(sampledebugContext, env, azSqlHelper);
      });

      afterEach(async function () {
        this.timeout(Timeout.finishAzureTestCase);
        await onAfter(sampledebugContext, env);
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
          await onAfterCreate(sampledebugContext, env, azSqlHelper);

          const debugEnvMap: Record<"local" | "dev", () => Promise<void>> = {
            local: async () => {
              try {
                // local debug
                await debugInitMap[sampleName]();
                for (const label of validate) {
                  await debugMap[label]();
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
            },
            dev: async () => {
              await runProvision(
                sampledebugContext.appName,
                env,
                false,
                options?.type === "spfx"
              );
              await runDeploy(Timeout.tabDeploy, options?.type === "spfx");
            },
          };
          await debugEnvMap[env]();

          if (options?.skipInit) {
            console.log("skip ui skipInit...");
            console.log("debug finish!");
            return;
          }

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
          console.log("debug finish!");
        }
      );
    });
  }
}
