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
  readContextMultiEnvV3,
  getUniqueAppName,
  editDotEnvFile,
} from "../commonUtils";
import {
  AadValidator,
  FrontendValidator,
  FunctionValidator,
  SqlValidator,
} from "../../commonlib";
import { getUuid } from "../../commonlib/utilities";
import { TemplateProject } from "../../commonlib/constants";
import { Executor } from "../../utils/executor";
import { Cleaner } from "../../utils/cleaner";
import m365Login from "@microsoft/teamsfx-cli/src/commonlib/m365Login";
import { environmentManager } from "@microsoft/teamsfx-core";

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  it(
    `${TemplateProject.TodoListBackend}`,
    { testPlanCaseId: 15277465, author: "v-ivanchen@microsoft.com" },
    async function () {
      await Executor.openTemplateProject(
        appName,
        testFolder,
        TemplateProject.TodoListBackend
      );
      expect(fs.pathExistsSync(projectPath)).to.be.true;
      expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;

      // Provision
      const envFilePath = path.resolve(projectPath, "env", ".env.dev.user");
      editDotEnvFile(envFilePath, "SQL_USER_NAME", "Abc123321");
      editDotEnvFile(
        envFilePath,
        "SQL_PASSWORD",
        "Cab232332" + getUuid().substring(0, 6)
      );
      // Provision
      {
        const { success } = await Executor.provision(projectPath);
        expect(success).to.be.true;
      }

      // Validate Provision
      const context = await readContextMultiEnvV3(projectPath, env);

      // Validate Aad App
      const aad = AadValidator.init(context, false, m365Login);
      await AadValidator.validate(aad);

      // Validate Tab Frontend
      const frontend = FrontendValidator.init(context);
      await FrontendValidator.validateProvision(frontend);

      // Validate Function App
      const functionValidator = new FunctionValidator(
        context,
        projectPath,
        env
      );
      await functionValidator.validateProvision();

      // deploy
      {
        const { success } = await Executor.deploy(projectPath);
        expect(success).to.be.true;
      }
    }
  );

  after(async () => {
    await Cleaner.clean(projectPath);
  });
});
