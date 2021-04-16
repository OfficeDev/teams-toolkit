// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { exec } from "child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";

import { NewGenerator } from "./newGenerator";
import { ResourceAddFunctionGenerator, ResourceAddSqlGenerator } from "./resouceAddGenerator";
import { ProvisionGenerator } from "./provisionGenerator";
import { DeployGenerator } from "./deployGenerator";
import CLILogProvider from "../commonlib/log";
import * as constants from "../constants";

CLILogProvider.setLogLevel(constants.CLILogLevel.debug);

const execAsync = promisify(exec);

const tmpFolder = path.resolve(os.homedir(), "test-folder");
if (!fs.pathExistsSync(tmpFolder)) {
  fs.mkdirSync(tmpFolder);
}

const appNameForResourceAdd = "tmpTeamsfxProj" + uuidv4().slice(0, 8);
const newCommandForResourceAdd = `teamsfx new --app-name ${appNameForResourceAdd} --interactive false`;
const projectPathFroResourceAdd = path.resolve(tmpFolder, appNameForResourceAdd);

const appNameForProvision = "tmpTeamsfxProj" + uuidv4().slice(0, 8);
const projectPathForProvision = path.resolve(tmpFolder, appNameForProvision);
const newCommandForProvision = `teamsfx new --app-name ${appNameForProvision} --azure-resources function sql --interactive false`;

const argv = process.argv.slice(2).map((stage) => stage.toLocaleLowerCase());
const runNewGenerator = argv.includes("new");
const runResourceAddGenerator = argv.includes("resource-add");
const runProvisionGenerator = argv.includes("provision");

const runNewCommandForResourceAdd = runResourceAddGenerator;
const runNewCommandForProvision = runProvisionGenerator;

(async () => {
  if (runNewGenerator) {
    const newGenerator = new NewGenerator();
    await newGenerator.run();
  }

  if (runNewCommandForResourceAdd) {
    CLILogProvider.info(
      `[ParamGenerator] Start to run '${newCommandForResourceAdd}' in ${tmpFolder}`
    );
    await execAsync(newCommandForResourceAdd, {
      cwd: tmpFolder,
      env: process.env,
      timeout: 0
    });
    CLILogProvider.info(
      `[ParamGenerator] Finish to run '${newCommandForResourceAdd}' in ${tmpFolder}`
    );
  }

  if (runResourceAddGenerator) {
    const resourceAddFunctionGenerator = new ResourceAddFunctionGenerator();
    await resourceAddFunctionGenerator.run(projectPathFroResourceAdd);

    const resourceAddSqlGenerator = new ResourceAddSqlGenerator();
    await resourceAddSqlGenerator.run(projectPathFroResourceAdd);
  }

  if (runNewCommandForProvision) {
    CLILogProvider.info(
      `[ParamGenerator] Start to run '${newCommandForProvision}' in ${tmpFolder}`
    );
    await execAsync(newCommandForProvision, {
      cwd: tmpFolder,
      env: process.env,
      timeout: 0
    });
    CLILogProvider.info(
      `[ParamGenerator] Finish to run '${newCommandForProvision}' in ${tmpFolder}`
    );
  }

  if (runProvisionGenerator) {
    const provisionGenerator = new ProvisionGenerator();
    await provisionGenerator.run(projectPathForProvision);
  }
})();
