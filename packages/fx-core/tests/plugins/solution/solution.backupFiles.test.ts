import { TestHelper } from "./helper";
import { fileEncoding, TestFilePath } from "../../constants";
import os from "os";
import path from "path";
import fs from "fs-extra";
import { backupFiles } from "../../../src/component/utils/backupFiles";
import { expect } from "chai";
import { MockTools } from "../../core/utils";
import { setTools } from "../../../src/core/globalVars";
import { MockContext } from "../../component/feature/apiconnector/utils";

describe("update Azure parameters", async () => {
  const parameterFileNameTemplate = (env: string) => `azure.parameters.${env}.json`;
  const stateFileNameTemplate = (env: string) => `state.${env}.json`;
  const userDataFileNameTemplate = (env: string) => `${env}.userdata`;
  const appSettingsFileName = "appsettings.Development.json";
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

  const context = MockContext();

  beforeEach(async () => {
    await fs.ensureDir(TestHelper.rootDir);
  });

  afterEach(async () => {
    await fs.remove(TestHelper.rootDir);
  });

  it("Backup Azure parameters file only", async () => {
    // Arrange
    await fs.ensureDir(configDir);
    await fs.writeFile(
      path.join(configDir, parameterFileNameTemplate(targetEnvName)),
      paramContent
    );
    const tools = new MockTools();
    setTools(tools);
    // Act
    const res = await backupFiles(targetEnvName, TestHelper.rootDir, false, false, context);

    // Assert
    const folderExist = await fs.pathExists(backupFolder);
    expect(folderExist).equal(true);

    expect(await fs.pathExists(targetConfigDir)).equal(true);
    const files = await fs.readdir(targetConfigDir);
    expect(files.length).equals(1);
    expect(files[0].includes("azure.parameters.target"));
    expect(res.isOk()).equal(true);

    const targetParamObj = JSON.parse(
      await fs.readFile(path.join(targetConfigDir, files[0]), fileEncoding)
    );
    expect(JSON.stringify(targetParamObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(
      paramContent
    );

    const gitIgnoreExists = await fs.pathExists(path.join(TestHelper.rootDir, ".gitignore"));
    expect(gitIgnoreExists).equal(true);
    const gitIgnoreContent = await fs.readFile(path.join(TestHelper.rootDir, ".gitignore"));
    expect(gitIgnoreContent.includes(".backup")).equal(true);
  });

  it("No files exist", async () => {
    // Arrange
    const tools = new MockTools();
    setTools(tools);

    // Act
    const res = await backupFiles(targetEnvName, TestHelper.rootDir, false, false, context);

    // Assert
    const folderExist = await fs.pathExists(backupFolder);
    expect(folderExist).equal(false);
    expect(res.isOk()).equal(true);
    const gitIgnoreExists = await fs.pathExists(path.join(TestHelper.rootDir, ".gitignore"));
    expect(gitIgnoreExists).equal(false);
  });

  it("Backup state and Azure parameters files", async () => {
    // Arrange
    const tools = new MockTools();
    setTools(tools);
    await fs.ensureDir(configDir);
    await fs.ensureDir(stateDir);
    await fs.writeFile(path.join(stateDir, stateFileNameTemplate(targetEnvName)), stateContent);
    await fs.writeFile(
      path.join(configDir, parameterFileNameTemplate(targetEnvName)),
      paramContent
    );

    // Act
    const res = await backupFiles(targetEnvName, TestHelper.rootDir, false, false, context);

    // Assert
    expect(res.isOk()).equal(true);
    expect(await fs.pathExists(backupFolder)).equal(true);
    expect(await fs.pathExists(targetConfigDir)).equal(true);
    const configFiles = await fs.readdir(targetConfigDir);
    expect(configFiles.length).equals(1);
    expect(configFiles[0].includes("azure.parameters.target"));
    const targetParamObj = JSON.parse(
      await fs.readFile(path.join(targetConfigDir, configFiles[0]), fileEncoding)
    );
    expect(JSON.stringify(targetParamObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(
      paramContent
    );

    expect(await fs.pathExists(targetStateDir)).equal(true);
    const stateFiles = await fs.readdir(targetStateDir);
    expect(stateFiles.length).equals(1);
    expect(stateFiles[0].includes("state.target"));
    expect(stateFiles[0].includes("state.target.json")).equal(false);
    const stateObj = JSON.parse(
      await fs.readFile(path.join(targetStateDir, stateFiles[0]), fileEncoding)
    );
    expect(JSON.stringify(stateObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(stateContent);

    const gitIgnoreExists = await fs.pathExists(path.join(TestHelper.rootDir, ".gitignore"));
    expect(gitIgnoreExists).equal(true);
    const gitIgnoreContent = await fs.readFile(path.join(TestHelper.rootDir, ".gitignore"));
    expect(gitIgnoreContent.includes(".backup")).equal(true);
  });

  it("Backup state, Azure parameters and user data files", async () => {
    // Arrange
    const tools = new MockTools();
    setTools(tools);
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
    const res = await backupFiles(targetEnvName, TestHelper.rootDir, false, false, context);

    // Assert
    expect(res.isOk()).equal(true);
    expect(await fs.pathExists(backupFolder)).equal(true);
    expect(await fs.pathExists(targetConfigDir)).equal(true);
    const configFiles = await fs.readdir(targetConfigDir);
    expect(configFiles.length).equals(1);
    expect(configFiles[0].includes("azure.parameters.target"));
    const targetParamObj = JSON.parse(
      await fs.readFile(path.join(targetConfigDir, configFiles[0]), fileEncoding)
    );
    expect(JSON.stringify(targetParamObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(
      paramContent
    );

    expect(await fs.pathExists(targetStateDir)).equal(true);
    const stateFiles = await fs.readdir(targetStateDir);
    expect(stateFiles.length).equals(2);
    stateFiles.sort((a, b) => a.length - b.length);

    expect(stateFiles[0].includes(".userdata"));
    expect(stateFiles[0].includes("target.userdata")).equal(false);
    expect(stateFiles[1].includes("state.target"));
    expect(stateFiles[1].includes("state.target.json")).equal(false);

    const stateObj = JSON.parse(
      await fs.readFile(path.join(targetStateDir, stateFiles[1]), fileEncoding)
    );
    expect(JSON.stringify(stateObj, undefined, 2).replace(/\r?\n/g, os.EOL)).equals(stateContent);

    const userData = await fs.readFile(path.join(targetStateDir, stateFiles[0]), fileEncoding);

    expect(userData.replace(/\r?\n/g, os.EOL)).equals(userDataContent);

    const gitIgnoreExists = await fs.pathExists(path.join(TestHelper.rootDir, ".gitignore"));
    expect(gitIgnoreExists).equal(true);
    const gitIgnoreContent = await fs.readFile(path.join(TestHelper.rootDir, ".gitignore"));
    expect(gitIgnoreContent.includes(".backup")).equal(true);
  });

  it("Backup in previously created .backup folder", async () => {
    // Arrange
    const tools = new MockTools();
    setTools(tools);
    await fs.ensureDir(configDir);
    await fs.ensureDir(stateDir);
    await fs.writeFile(
      path.join(configDir, parameterFileNameTemplate(targetEnvName)),
      paramContent
    );
    await fs.ensureDir(backupFolder);
    await fs.ensureDir(path.join(backupFolder, ".fx"));

    // Act
    const res = await backupFiles(targetEnvName, TestHelper.rootDir, false, false, context);

    // Assert
    expect(await fs.pathExists(backupFolder)).equal(true);
    expect(await fs.pathExists(targetConfigDir)).equal(true);
    const configFiles = await fs.readdir(targetConfigDir);
    expect(configFiles.length).equals(1);
    expect(configFiles[0].includes("azure.parameters.target"));
    expect(res.isOk()).equal(true);

    const gitIgnoreExists = await fs.pathExists(path.join(TestHelper.rootDir, ".gitignore"));
    expect(gitIgnoreExists).equal(true);
    const gitIgnoreContent = await fs.readFile(path.join(TestHelper.rootDir, ".gitignore"));
    expect(gitIgnoreContent.includes(".backup")).equal(true);
  });

  it("Backup in .teamsfx.backup folder", async () => {
    // Arrange
    const tools = new MockTools();
    setTools(tools);
    await fs.ensureDir(configDir);
    await fs.ensureDir(stateDir);
    await fs.writeFile(
      path.join(configDir, parameterFileNameTemplate(targetEnvName)),
      paramContent
    );
    await fs.ensureDir(backupFolder);
    await fs.ensureDir(path.join(backupFolder, ".conflict"));

    // Act
    const res = await backupFiles(targetEnvName, TestHelper.rootDir, false, false, context);

    // Assert
    const teamsfxBackupFolder = path.join(TestHelper.rootDir, ".teamsfx.backup");
    const teamsfxTargetConfigDir = path.join(teamsfxBackupFolder, TestFilePath.configFolder);
    expect(await fs.pathExists(teamsfxBackupFolder)).equal(true);
    expect(await fs.pathExists(teamsfxTargetConfigDir)).equal(true);
    const configFiles = await fs.readdir(teamsfxTargetConfigDir);
    expect(configFiles.length).equals(1);
    expect(configFiles[0].includes("azure.parameters.target"));
    expect(res.isOk()).equal(true);

    const gitIgnoreExists = await fs.pathExists(path.join(TestHelper.rootDir, ".gitignore"));
    expect(gitIgnoreExists).equal(true);
    const gitIgnoreContent = await fs.readFile(path.join(TestHelper.rootDir, ".gitignore"));
    expect(gitIgnoreContent.includes(".backup")).equal(true);
  });

  it("Backup appSettings file", async () => {
    // Arrange
    await fs.writeFile(path.join(TestHelper.rootDir, appSettingsFileName), paramContent);
    const tools = new MockTools();
    setTools(tools);
    // Act
    const res = await backupFiles("local", TestHelper.rootDir, true, false, context);

    // Assert
    const folderExist = await fs.pathExists(backupFolder);
    expect(folderExist).equal(true);

    const files = await fs.readdir(backupFolder);
    expect(files.length).equals(2);
    expect(
      files[0].includes("appsettings.Development") || files[1].includes("appsettings.Development")
    );
  });
});
