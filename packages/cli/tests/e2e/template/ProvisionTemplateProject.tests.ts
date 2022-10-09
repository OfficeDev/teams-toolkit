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
  execAsync,
  getTestFolder,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  getSubscriptionId,
  readContextMultiEnv,
  execAsyncWithRetry
} from "../commonUtils";
import {
  AadValidator,
  FrontendValidator,
  FunctionValidator,
  BotValidator,
  SqlValidator,
  SharepointValidator
} from "../../commonlib"
import { TemplateProject } from "../../commonlib/constants"
import { CliHelper } from "../../commonlib/cliHelper";
import m365Login from "../../../src/commonlib/m365Login";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";

describe("teamsfx new template", function () {
  let appId: string;
  let appName: string;
  let testFolder: string;
  let projectPath: string;

  const env = environmentManager.getDefaultEnvName();
  const subscription = getSubscriptionId();
  beforeEach(async () => {
    testFolder = getTestFolder();
  });

  it(`${TemplateProject.HelloWorldTabSSO}`, { testPlanCaseId: 15277458 }, async function () {
    projectPath = path.resolve(testFolder, TemplateProject.HelloWorldTabSSO);
    await execAsync(`teamsfx new template ${TemplateProject.HelloWorldTabSSO}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    const context = await readContextMultiEnv(projectPath, env);
    // Validate Aad App
    const aad = AadValidator.init(context, false, m365Login);
    await AadValidator.validate(aad);

    // Validate Tab Frontend
    const frontend = FrontendValidator.init(context);
    await FrontendValidator.validateProvision(frontend);

    // deploy
    await CliHelper.deployAll(projectPath);

    await cleanUp(appName, projectPath, true, false, false);

  });

  it(`${TemplateProject.HelloWorldTabBackEnd}`, { testPlanCaseId: 15277459 }, async function () {
    projectPath = path.resolve(testFolder, TemplateProject.HelloWorldTabBackEnd);
    await execAsync(`teamsfx new template ${TemplateProject.HelloWorldTabBackEnd}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    const context = await readContextMultiEnv(projectPath, env);
    // Validate Aad App
    const aad = AadValidator.init(context, false, m365Login);
    await AadValidator.validate(aad);

    // Validate Tab Frontend
    const frontend = FrontendValidator.init(context);
    await FrontendValidator.validateProvision(frontend);

    // Validate Function App
    const functionValidator = new FunctionValidator(context, projectPath, env);
    await functionValidator.validateProvision();

    // deploy
    await CliHelper.deployAll(projectPath);

    await cleanUp(appName, projectPath, true, false, false);

  });

  it(`${TemplateProject.HelloWorldBot}`, { testPlanCaseId: 15277461 }, async function () {
    projectPath = path.resolve(testFolder, TemplateProject.HelloWorldBot);
    await execAsync(`teamsfx new template ${TemplateProject.HelloWorldBot}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    const context = await readContextMultiEnv(projectPath, env);

    // Validate Bot Provision
    const bot = new BotValidator(context, projectPath, env);
    await bot.validateProvision(false);

    // deploy
    await CliHelper.deployAll(projectPath);

    {
      // Validate deployment

      // Get context
      const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

      // Validate Bot Deploy
      const bot = new BotValidator(context, projectPath, env);
      await bot.validateDeploy();
    }

    // test (validate)
    await execAsync(`teamsfx validate`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    // package
    await execAsync(`teamsfx package`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    await cleanUp(appName, projectPath, false, true, false);

  });

  it(`${TemplateProject.ContactExporter}`, { testPlanCaseId: 15277462 }, async function () {
    projectPath = path.resolve(testFolder, TemplateProject.ContactExporter);
    await execAsync(`teamsfx new template ${TemplateProject.ContactExporter}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    const context = await readContextMultiEnv(projectPath, env);
    // Validate Aad App
    const aad = AadValidator.init(context, false, m365Login);
    await AadValidator.validate(aad);

    // Validate Tab Frontend
    const frontend = FrontendValidator.init(context);
    await FrontendValidator.validateProvision(frontend);

    // deploy
    await CliHelper.deployAll(projectPath);

    await cleanUp(appName, projectPath, true, false, false);

  });

  it(`${TemplateProject.OneProductivityHub}`, { testPlanCaseId: 15277463 }, async function () {
    projectPath = path.resolve(testFolder, TemplateProject.OneProductivityHub);
    await execAsync(`teamsfx new template ${TemplateProject.OneProductivityHub}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    const context = await readContextMultiEnv(projectPath, env);
    // Validate Aad App
    const aad = AadValidator.init(context, false, m365Login);
    await AadValidator.validate(aad);

    // Validate Tab Frontend
    const frontend = FrontendValidator.init(context);
    await FrontendValidator.validateProvision(frontend);

    // deploy
    await CliHelper.deployAll(projectPath);

    await cleanUp(appName, projectPath, true, false, false);

  });

  it(`${TemplateProject.HelloWorldBotSSO}`, { testPlanCaseId: 15277464 }, async function () {
    projectPath = path.resolve(testFolder, TemplateProject.HelloWorldBotSSO);
    await execAsync(`teamsfx new template ${TemplateProject.HelloWorldBotSSO}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    const context = await readContextMultiEnv(projectPath, env);

    // Validate Bot Provision
    const bot = new BotValidator(context, projectPath, env);
    await bot.validateProvision(false);

    // deploy
    await CliHelper.deployAll(projectPath);

    {
      // Validate deployment

      // Get context
      const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

      // Validate Aad App
      const aad = AadValidator.init(context, false, m365Login);
      await AadValidator.validate(aad);

      // Validate Bot Deploy
      const bot = new BotValidator(context, projectPath, env);
      await bot.validateDeploy();
    }

    // test (validate)
    await execAsync(`teamsfx validate`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    // package
    await execAsync(`teamsfx package`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    await cleanUp(appName, projectPath, true, true, false);

  });

  it(`${TemplateProject.TodoListBackend}`, { testPlanCaseId: 15277465 }, async function () {
    projectPath = path.resolve(testFolder, TemplateProject.TodoListBackend);
    await execAsync(`teamsfx new template ${TemplateProject.TodoListBackend}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    const context = await readContextMultiEnv(projectPath, env);
    // Validate Aad App
    const aad = AadValidator.init(context, false, m365Login);
    await AadValidator.validate(aad);

    // Validate Tab Frontend
    const frontend = FrontendValidator.init(context);
    await FrontendValidator.validateProvision(frontend);

    // Validate Function App
    const functionValidator = new FunctionValidator(context, projectPath, env);
    await functionValidator.validateProvision();

    // Validate Aad App
    await SqlValidator.init(context);
    await SqlValidator.validateSql();
    await SqlValidator.validateDatabaseCount(2);

    // deploy
    await CliHelper.deployAll(projectPath);

    await cleanUp(appName, projectPath, true, false, false);

  });

  it(`${TemplateProject.TodoListSpfx}`, { testPlanCaseId: 15277466 }, async function () {
    projectPath = path.resolve(testFolder, TemplateProject.TodoListSpfx);
    await execAsync(`teamsfx new template ${TemplateProject.TodoListSpfx}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    const context = await readContextMultiEnv(projectPath, env);

    // Validate Tab Frontend
    const frontend = FrontendValidator.init(context);
    await FrontendValidator.validateProvision(frontend);

    // deploy
    await CliHelper.deployAll(projectPath);

    {
      // Validate sharepoint package
      const solutionConfig = await fs.readJson(`${projectPath}/SPFx/config/package-solution.json`);
      const sharepointPackage = `${projectPath}/SPFx/sharepoint/${solutionConfig.paths.zippedPackage}`;
      appId = solutionConfig["solution"]["id"];
      expect(appId).to.not.be.empty;
      expect(await fs.pathExists(sharepointPackage)).to.be.true;

      // Check if package exsist in App Catalog
      SharepointValidator.init();
      SharepointValidator.validateDeploy(appId);
    }

    await cleanUp(appName, projectPath, true, false, true);

  });

});
