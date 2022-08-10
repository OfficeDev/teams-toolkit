import { TestHelper } from "./helper";
import * as sinon from "sinon";
import { TestFilePath } from "../../constants";
import os from "os";
import path from "path";
import fs from "fs-extra";
import { backupFiles } from "../../../src/plugins/solution/fx-solution/utils/backupFiles";
import { expect } from "chai";

describe.only("update Azure parameters", async () => {
  const parameterFileNameTemplate = (env: string) => `azure.parameters.${env}.json`;
  const stateFileNameTemplate = (env: string) => `state.${env}.json`;
  const userDataFileNameTemplate = (env: string) => `${env}.userdata`;
  const configDir = path.join(TestHelper.rootDir, TestFilePath.configFolder);
  const stateDir = path.join(TestHelper.rootDir, TestFilePath.stateFolder);
  const backupFolder = path.join(TestHelper.rootDir, ".backup");

  const targetConfigDir = path.join(backupFolder, TestFilePath.configFolder);
  const targetStateDir = path.join(backupFolder, TestFilePath.stateFolder);

  const targetEnvName = "target";
  const originalResourceBaseName = "originalResourceBaseName";
  const paramContent = TestHelper.getParameterFileContent(
    {
      resourceBaseName: originalResourceBaseName,
      param1: "value1",
      param2: "value2",
    },
    {
      userParam1: "userParamValue1",
      userParam2: "userParamValue2",
    }
  );

  const stateObj = {
    solution: { teamsAppTenantId: "mockTid" },
  };
  const stateContent = JSON.stringify(stateObj, undefined, 2).replace(/\r?\n/g, os.EOL);
  const userDataContent = JSON.stringify("userData", undefined, 2).replace(/\r?\n/g, os.EOL);

  const mocker = sinon.createSandbox();

  beforeEach(async () => {
    await fs.ensureDir(TestHelper.rootDir);
  });

  afterEach(async () => {
    await fs.remove(TestHelper.rootDir);
    mocker.restore();
  });

  it("Backup Azure parameters file only", async () => {
    // Arrange
    await fs.ensureDir(configDir);
    await fs.writeFile(
      path.join(configDir, parameterFileNameTemplate(targetEnvName)),
      paramContent
    );
    // Act
    const res = await backupFiles(targetEnvName, TestHelper.rootDir);

    // Assert
    const folderExist = await fs.pathExists(backupFolder);
    expect(folderExist).equal(true);

    expect(await fs.pathExists(targetConfigDir)).equal(true);
    const files = await fs.readdir(targetConfigDir);
    expect(files.length).equals(1);
    expect(files[0].includes("azure.parameters.target"));
    expect(res.isOk()).equal(true);
  });

  it("No files exist", async () => {
    // Act
    const res = await backupFiles(targetEnvName, TestHelper.rootDir);

    // Assert
    const folderExist = await fs.pathExists(backupFolder);
    expect(folderExist).equal(false);
  });

  it("Backup state and Azure parameters files", async () => {
    // Arrange
    await fs.ensureDir(configDir);
    await fs.ensureDir(stateDir);
    await fs.writeFile(path.join(stateDir, stateFileNameTemplate(targetEnvName)), stateContent);
    await fs.writeFile(
      path.join(configDir, parameterFileNameTemplate(targetEnvName)),
      paramContent
    );

    // Act
    const res = await backupFiles(targetEnvName, TestHelper.rootDir);

    // Assert
    expect(await fs.pathExists(backupFolder)).equal(true);
    expect(await fs.pathExists(targetConfigDir)).equal(true);
    const configFiles = await fs.readdir(targetConfigDir);
    expect(configFiles.length).equals(1);
    expect(configFiles[0].includes("azure.parameters.target"));
    expect(res.isOk()).equal(true);

    expect(await fs.pathExists(targetStateDir)).equal(true);
    const stateFiles = await fs.readdir(targetStateDir);
    expect(stateFiles.length).equals(1);
    expect(stateFiles[0].includes("state.target"));
    expect(stateFiles[0].includes("state.target.json")).equal(false);
    expect(res.isOk()).equal(true);
  });

  it("Backup state, Azure parameters and user data files", async () => {
    // Arrange
    await fs.ensureDir(configDir);
    await fs.ensureDir(stateDir);
    await fs.writeFile(path.join(stateDir, stateFileNameTemplate(targetEnvName)), stateContent);
    await fs.writeFile(
      path.join(configDir, parameterFileNameTemplate(targetEnvName)),
      paramContent
    );
    await fs.writeFile(
      path.join(stateDir, userDataFileNameTemplate(targetEnvName)),
      userDataContent
    );

    // Act
    const res = await backupFiles(targetEnvName, TestHelper.rootDir);

    // Assert
    expect(await fs.pathExists(backupFolder)).equal(true);
    expect(await fs.pathExists(targetConfigDir)).equal(true);
    const configFiles = await fs.readdir(targetConfigDir);
    expect(configFiles.length).equals(1);
    expect(configFiles[0].includes("azure.parameters.target"));
    expect(res.isOk()).equal(true);

    expect(await fs.pathExists(targetStateDir)).equal(true);
    const stateFiles = await fs.readdir(targetStateDir);
    expect(stateFiles.length).equals(2);
    stateFiles.sort((a, b) => a.length - b.length);

    expect(stateFiles[1].includes(".userdata"));
    expect(stateFiles[1].includes("target.userdata")).equal(false);
    expect(stateFiles[1].includes("state.target"));
    expect(stateFiles[1].includes("state.target.json")).equal(false);
    expect(res.isOk()).equal(true);
  });
});
