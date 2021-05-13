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
import {
  ResourceAddApimGenerator,
  ResourceAddFunctionGenerator,
  ResourceAddSqlGenerator,
} from "./resouceAddGenerator";
import { ProvisionGenerator } from "./provisionGenerator";
import { DeployGenerator } from "./deployGenerator";
import CLILogProvider from "../commonlib/log";
import * as constants from "../constants";
import {
  CapabilityAddBotGenerator,
  CapabilityAddTabGenerator,
  CapabilityAddMessageExtensionGenerator,
} from "./capabilityAdd";

CLILogProvider.setLogLevel(constants.CLILogLevel.verbose);

const execAsync = promisify(exec);

const tmpFolder = path.resolve(os.homedir(), "test-folder");
if (!fs.pathExistsSync(tmpFolder)) {
  fs.mkdirSync(tmpFolder);
}

const appNameForResourceAdd = "tmpTeamsfxProj" + uuidv4().slice(0, 8);
const newCommandForResourceAdd = `teamsfx new --app-name ${appNameForResourceAdd} --interactive false`;
const projectPathForResourceAdd = path.resolve(tmpFolder, appNameForResourceAdd);

const appNameForCapabilityAddTab = "tmpTeamsfxProj" + uuidv4().slice(0, 8);
const newCommandForCapabilityAddTab = `teamsfx new --app-name ${appNameForCapabilityAddTab} --capabilities bot --interactive false`;
const projectPathForCapabilityAddTab = path.resolve(tmpFolder, appNameForCapabilityAddTab);
const appNameForCapabilityAddBot = "tmpTeamsfxProj" + uuidv4().slice(0, 8);
const newCommandForCapabilityAddBot = `teamsfx new --app-name ${appNameForCapabilityAddBot} --capabilities tab --interactive false`;
const projectPathForCapabilityAddBot = path.resolve(tmpFolder, appNameForCapabilityAddBot);
const appNameForCapabilityAddMessageExtension = "tmpTeamsfxProj" + uuidv4().slice(0, 8);
const newCommandForCapabilityAddMessageExtension = `teamsfx new --app-name ${appNameForCapabilityAddMessageExtension} --capabilities tab --interactive false`;
const projectPathForCapabilityAddMessageExtension = path.resolve(
  tmpFolder,
  appNameForCapabilityAddMessageExtension
);

const appNameForProvision = "tmpTeamsfxProj" + uuidv4().slice(0, 8);
const projectPathForProvision = path.resolve(tmpFolder, appNameForProvision);
const newCommandForProvision = `teamsfx new --app-name ${appNameForProvision} --azure-resources function sql --interactive false`;

const argv = process.argv.slice(2).map((stage) => stage.toLocaleLowerCase());
const runNewGenerator = argv.includes("new");
const runResourceAddGenerator = argv.includes("resource-add");
const runCapabilityAddGenerator = argv.includes("capability-add");
const runProvisionGenerator = argv.includes("provision");

const runNewCommandForResourceAdd = runResourceAddGenerator;
const runNewCommandForCapabilityAdd = runCapabilityAddGenerator;
const runNewCommandForProvision = runProvisionGenerator;

const RunCommand = async (command: string, folder: string) => {
  CLILogProvider.info(`[ParamGenerator] Start to run '${command}' in ${folder}`);
  await execAsync(command, {
    cwd: folder,
    env: process.env,
    timeout: 0,
  });
  CLILogProvider.info(`[ParamGenerator] Finish to run '${command}' in ${folder}`);
};

(async () => {
  if (runNewGenerator) {
    const newGenerator = new NewGenerator();
    await newGenerator.run();
  }

  if (runNewCommandForResourceAdd) {
    await RunCommand(newCommandForResourceAdd, tmpFolder);
  }

  if (runResourceAddGenerator) {
    const resourceAddFunctionGenerator = new ResourceAddFunctionGenerator();
    await resourceAddFunctionGenerator.run(projectPathForResourceAdd);

    const resourceAddSqlGenerator = new ResourceAddSqlGenerator();
    await resourceAddSqlGenerator.run(projectPathForResourceAdd);

    const resourceAddApimGenerator = new ResourceAddApimGenerator();
    await resourceAddApimGenerator.run(projectPathForResourceAdd);

    await fs.remove(projectPathForResourceAdd);
  }

  if (runNewCommandForCapabilityAdd) {
    await RunCommand(newCommandForCapabilityAddTab, tmpFolder);
    await RunCommand(newCommandForCapabilityAddBot, tmpFolder);
    await RunCommand(newCommandForCapabilityAddMessageExtension, tmpFolder);
  }

  if (runCapabilityAddGenerator) {
    const capabilityAddTabGenerator = new CapabilityAddTabGenerator();
    await capabilityAddTabGenerator.run(projectPathForCapabilityAddTab);
    await fs.remove(projectPathForCapabilityAddTab);

    const capabilityAddBotGenerator = new CapabilityAddBotGenerator();
    await capabilityAddBotGenerator.run(projectPathForCapabilityAddBot);
    await fs.remove(projectPathForCapabilityAddBot);

    const capabilityAddMessageExtensionGenerator = new CapabilityAddMessageExtensionGenerator();
    await capabilityAddMessageExtensionGenerator.run(projectPathForCapabilityAddMessageExtension);
    await fs.remove(projectPathForCapabilityAddMessageExtension);
  }

  if (runNewCommandForProvision) {
    await RunCommand(newCommandForProvision, tmpFolder);
  }

  if (runProvisionGenerator) {
    const provisionGenerator = new ProvisionGenerator();
    await provisionGenerator.run(projectPathForProvision);
    await fs.remove(projectPathForProvision);
  }
})();
