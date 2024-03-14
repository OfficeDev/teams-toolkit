// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import {
  getTestFolder,
  getUniqueAppName,
  readContextMultiEnvV3,
  validateTabAndBotProjectProvision,
  createResourceGroup,
} from "./commonUtils";
import { Executor } from "../utils/executor";
import { Cleaner } from "../commonlib/cleaner";
import { Capability } from "../utils/constants";
import {
  environmentNameManager,
  ProgrammingLanguage,
} from "@microsoft/teamsfx-core";
import {
  AadValidator,
  FrontendValidator,
  BotValidator,
  FunctionValidator,
} from "../commonlib";
import m365Login from "@microsoft/teamsapp-cli/src/commonlib/m365Login";

export abstract class CaseFactory {
  public capability: Capability;
  public testPlanCaseId: number;
  public author: string;
  public validate: (
    | "bot"
    | "tab"
    | "aad"
    | "dashboard"
    | "sql"
    | "function"
    | "spfx"
    | "tab & bot"
  )[] = [];
  public options?: {
    skipProvision?: boolean;
    skipDeploy?: boolean;
    skipValidate?: boolean;
    skipPackage?: boolean;
  };
  public custimized?: Record<string, string>;

  public constructor(
    capability: Capability,
    testPlanCaseId: number,
    author: string,
    validate: (
      | "bot"
      | "tab"
      | "aad"
      | "dashboard"
      | "sql"
      | "function"
      | "spfx"
      | "tab & bot"
    )[] = [],
    options: {
      skipProvision?: boolean;
      skipDeploy?: boolean;
      skipValidate?: boolean;
      skipPackage?: boolean;
    } = {},
    custimized?: Record<string, string>
  ) {
    this.capability = capability;
    this.testPlanCaseId = testPlanCaseId;
    this.author = author;
    this.validate = validate;
    this.options = options;
    this.custimized = custimized;
  }

  public onBefore(): Promise<void> {
    return Promise.resolve();
  }

  public async onAfter(projectPath: string): Promise<void> {
    await Cleaner.clean(projectPath);
  }

  public async onAfterCreate(projectPath: string): Promise<void> {
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;
  }

  public async onCreate(
    appName: string,
    testFolder: string,
    capability: Capability,
    custimized?: Record<string, string>
  ): Promise<void> {
    await Executor.createProject(
      testFolder,
      appName,
      capability,
      ProgrammingLanguage.TS,
      custimized
    );
  }

  public async onBeforeProvision(projectPath: string): Promise<void> {
    return Promise.resolve();
  }

  public test() {
    const {
      capability,
      testPlanCaseId,
      author,
      validate,
      options,
      custimized,
      onBefore,
      onAfter,
      onAfterCreate,
      onBeforeProvision,
      onCreate,
    } = this;
    describe(`template Test: ${capability}`, function () {
      const testFolder = getTestFolder();
      const appName = getUniqueAppName();
      const projectPath = path.resolve(testFolder, appName);
      const env = environmentNameManager.getDefaultEnvName();
      before(async () => {
        await onBefore();
      });

      after(async function () {
        await onAfter(projectPath);
      });

      it(capability, { testPlanCaseId, author }, async function () {
        // create project
        await onCreate(appName, testFolder, capability, custimized);
        expect(fs.pathExistsSync(projectPath)).to.be.true;

        await onAfterCreate(projectPath);

        // provision
        {
          if (options?.skipProvision) {
            console.log("skip Provision...");
            console.log("debug finish!");
            return;
          }

          await onBeforeProvision(projectPath);

          const result = await createResourceGroup(appName + "-rg", "westus");
          expect(result).to.be.true;
          process.env["AZURE_RESOURCE_GROUP_NAME"] = appName + "-rg";

          const { success } = await Executor.provision(projectPath);
          expect(success).to.be.true;

          // Validate Provision
          const context = await readContextMultiEnvV3(projectPath, env);
          if (validate.includes("bot")) {
            // Validate Bot Provision
            const bot = new BotValidator(context, projectPath, env);
            await bot.validateProvisionV3(false);
          }
          if (validate.includes("tab")) {
            // Validate Tab Frontend
            const frontend = FrontendValidator.init(context);
            await FrontendValidator.validateProvision(frontend);
          }
          if (validate.includes("aad")) {
            // Validate Aad App
            const aad = AadValidator.init(context, false, m365Login);
            await AadValidator.validate(aad);
          }
          if (validate.includes("tab & bot")) {
            // Validate Tab & Bot Provision
            await validateTabAndBotProjectProvision(projectPath, env);
          }
          if (validate.includes("function")) {
            // Validate Function App
            const functionValidator = new FunctionValidator(
              context,
              projectPath,
              env
            );
            await functionValidator.validateProvision();
          }
        }

        // deploy
        {
          if (options?.skipDeploy) {
            console.log("skip Deploy...");
            console.log("debug finish!");
            return;
          }
          const { success } = await Executor.deploy(projectPath);
          expect(success).to.be.true;

          // Validate deployment
          const context = await readContextMultiEnvV3(projectPath, env);
          if (validate.includes("bot")) {
            // Validate Bot Deploy
            const bot = new BotValidator(context, projectPath, env);
            await bot.validateDeploy();
          }
        }

        // validate
        {
          if (options?.skipValidate) {
            console.log("skip Validate...");
            console.log("debug finish!");
            return;
          }
          const { success } = await Executor.validate(projectPath);
          expect(success).to.be.true;
        }

        // package
        {
          if (options?.skipPackage) {
            console.log("skip Package...");
            console.log("debug finish!");
            return;
          }
          const { success } = await Executor.package(projectPath);
          expect(success).to.be.true;
        }
      });
    });
  }
}
