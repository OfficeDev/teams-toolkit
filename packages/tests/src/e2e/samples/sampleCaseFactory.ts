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
  removeTeamsAppExtendToM365,
  editDotEnvFile,
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
import { getUuid } from "../../commonlib/utilities";

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
    | "proactive"
  )[] = []
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
        // disable CI
        process.env["CI"] = "false";

        before(async () => {});

        it(sampleName, { testPlanCaseId, author }, async function () {
          await Executor.openTemplateProject(appName, testFolder, sampleName);
          expect(fs.pathExistsSync(projectPath)).to.be.true;
          if (validate.includes("spfx")) {
            expect(fs.pathExistsSync(path.resolve(projectPath, "src", "src")))
              .to.be.true;
          } else if (!validate.includes("proactive")) {
            expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be
              .true;
          }
          if (validate.includes("dashboard")) {
            // remove teamsApp/extendToM365 in case it fails
            removeTeamsAppExtendToM365(path.join(projectPath, "teamsapp.yml"));
          }
          // validate
          await Executor.validate(projectPath);

          // Provision
          {
            if (validate.includes("sql")) {
              const envFilePath = path.resolve(
                projectPath,
                "env",
                ".env.dev.user"
              );
              editDotEnvFile(envFilePath, "SQL_USER_NAME", "Abc123321");
              editDotEnvFile(
                envFilePath,
                "SQL_PASSWORD",
                "Cab232332" + getUuid().substring(0, 6)
              );
            }
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
            if (validate.includes("sql")) {
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
            const { success } = await Executor.validate(projectPath);
            expect(success).to.be.true;
          }

          // package
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
