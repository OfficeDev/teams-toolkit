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
} from "../commonUtils";
import { Executor } from "../../utils/executor";
import { Cleaner } from "../../commonlib/cleaner";
import { TemplateProjectFolder } from "../../utils/constants";
import { environmentManager } from "@microsoft/teamsfx-core";
import {
  AadValidator,
  FrontendValidator,
  BotValidator,
  FunctionValidator,
} from "../../commonlib";
import m365Login from "@microsoft/teamsfx-cli/src/commonlib/m365Login";
import { middleWareMap } from "./middleWare";

export default function sampleCaseFactory(
  sampleName: TemplateProjectFolder,
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
  skips?: {
    skipProvision?: boolean;
    skipDeploy?: boolean;
    skipValidate?: boolean;
    skipPackage?: boolean;
  }
) {
  let samplePath = "";
  return {
    sampleName,
    samplePath,
    test: function () {
      describe("teamsfx new template", function () {
        const testFolder = getTestFolder();
        const appName = getUniqueAppName();
        const projectPath = path.resolve(testFolder, appName);
        const env = environmentManager.getDefaultEnvName();
        samplePath = projectPath;
        before(async () => {});

        it(sampleName, { testPlanCaseId, author }, async function () {
          // Create middleWare
          console.log("[start] Create middleWare");
          await middleWareMap[sampleName](
            sampleName,
            testFolder,
            appName,
            projectPath,
            { create: true }
          );
          console.log("[end] Create middleWare");

          expect(fs.pathExistsSync(projectPath)).to.be.true;
          // after create middleWare
          console.log("[start] after create middleWare");
          await middleWareMap[sampleName](
            sampleName,
            testFolder,
            appName,
            projectPath,
            { afterCreate: true }
          );
          console.log("[end] after create middleWare");

          // Provision
          if (skips?.skipProvision) return;
          {
            // before provision middleWare
            console.log("[start] before provision middleWare");
            await middleWareMap[sampleName](
              sampleName,
              testFolder,
              appName,
              projectPath,
              { beforeProvision: true }
            );
            console.log("[end] before provision middleWare");

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
          if (skips?.skipDeploy) return;
          {
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
          if (skips?.skipValidate) return;
          {
            const { success } = await Executor.validate(projectPath);
            expect(success).to.be.true;
          }

          // package
          if (skips?.skipPackage) return;
          {
            const { success } = await Executor.package(projectPath);
            expect(success).to.be.true;
          }
        });
        after(async () => {
          await Cleaner.clean(projectPath);
        });
      });
    },
  };
}
