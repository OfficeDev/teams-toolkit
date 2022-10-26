import {
  ConfigFolderName,
  EnvNamePlaceholder,
  err,
  FxError,
  ok,
  ResourceContextV3,
  Result,
  UserError,
} from "@microsoft/teamsfx-api";
import path from "path";
import fs from "fs-extra";
import * as os from "os";
import { SolutionError, SolutionSource } from "../constants";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";
import { getResourceFolder } from "../../folder";
import { addPathToGitignore } from "../../core/middleware/projectMigrator";
import { TOOLS } from "../../core/globalVars";

const windowsPathLengthLimit = 260;
const fileNameLengthLimit = 255;
const configFolder = `.${ConfigFolderName}/configs`;
const azureParameterFileNameTemplate = `azure.parameters.${EnvNamePlaceholder}.json`;
const stateFolder = `.${ConfigFolderName}/states`;
const stateFileNameTemplate = `state.${EnvNamePlaceholder}.json`;
const userDateFileNameTemplate = `${EnvNamePlaceholder}.userdata`;
const jsonSuffix = ".json";
const userDataSuffix = ".userdata";
const appSettingsFileName = "appsettings.Development.json";

const reportName = "backup-config-change-logs.md";

async function doesBackupFolderCreatedByTTK(backupPath: string) {
  return (
    (await fs.readdir(backupPath)).length === 0 ||
    (await fs.pathExists(path.join(backupPath, ".fx"))) ||
    (await fs.pathExists(path.join(backupPath, "aad-manifest-change-logs.md"))) ||
    (await fs.pathExists(path.join(backupPath, "upgrade-change-logs.md")))
  );
}

async function getBackupFolder(projectPath: string): Promise<string> {
  const backupName = ".backup";
  const backupPath = path.join(projectPath, backupName);

  const teamsfxBackupPath = path.join(projectPath, `.teamsfx${backupName}`);

  if (!(await fs.pathExists(backupPath)) || (await doesBackupFolderCreatedByTTK(backupPath))) {
    return backupPath;
  }

  return teamsfxBackupPath;
}

export async function backupFiles(
  env: string,
  projectPath: string,
  isCSharpProject: boolean,
  isVSPlatform: boolean,
  ctx: ResourceContextV3
): Promise<Result<undefined, FxError>> {
  const time = formatDate();
  const backupFolder = await getBackupFolder(projectPath);

  // state file
  const stateFileBackupRes = await backupFxFile(
    projectPath,
    env,
    stateFileNameTemplate,
    stateFolder,
    backupFolder,
    time,
    jsonSuffix
  );
  if (stateFileBackupRes.isErr()) {
    return err(stateFileBackupRes.error);
  }

  // user data file
  const userDataFileBackupRes = await backupFxFile(
    projectPath,
    env,
    userDateFileNameTemplate,
    stateFolder,
    backupFolder,
    time,
    userDataSuffix
  );
  if (userDataFileBackupRes.isErr()) {
    return err(userDataFileBackupRes.error);
  }

  // Azure parameter file
  if (env !== "local") {
    const azureParameterFileBackupRes = await backupFxFile(
      projectPath,
      env,
      azureParameterFileNameTemplate,
      configFolder,
      backupFolder,
      time,
      jsonSuffix
    );

    if (azureParameterFileBackupRes.isErr()) {
      return err(azureParameterFileBackupRes.error);
    }
  }

  // Back up appsettings.Development.json
  if (env === "local" && isCSharpProject) {
    const sourceFilePath = path.join(projectPath, appSettingsFileName);
    const appSettingsBackupRes = await backupSrcFile(
      sourceFilePath,
      appSettingsFileName,
      backupFolder,
      time,
      jsonSuffix
    );
    if (appSettingsBackupRes.isErr()) {
      return err(appSettingsBackupRes.error);
    }
  }

  // generate readme.
  await generateReport(backupFolder, isVSPlatform, ctx);

  // update .gitignore
  if (await fs.pathExists(backupFolder)) {
    await addPathToGitignore(projectPath, backupFolder, TOOLS.logProvider);
  }

  return ok(undefined);
}

async function backupSrcFile(
  sourceFilePath: string,
  sourceFileName: string,
  backupFileParentPath: string,
  time: string,
  suffix: string
): Promise<Result<undefined, FxError>> {
  try {
    const backupFileName = generateBackupFileName(
      sourceFileName,
      backupFileParentPath,
      suffix,
      time
    );

    const backupFile = path.join(backupFileParentPath, backupFileName);
    await copyFileToBackupFolderIfExists(sourceFilePath, backupFile, backupFileParentPath);
    return ok(undefined);
  } catch (exception) {
    const error = new UserError(
      SolutionSource,
      SolutionError.FailedToBackupFiles,
      getDefaultString("core.backupFiles.FailedToBackupFiles", sourceFilePath),
      getLocalizedString("core.backupFiles.FailedToBackupFiles", sourceFilePath)
    );
    return err(error);
  }
}

async function backupFxFile(
  projectPath: string,
  env: string,
  fileNameTemplate: string,
  folder: string,
  backupFolder: string,
  time: string,
  suffix: string
): Promise<Result<undefined, FxError>> {
  const sourceFileName = fileNameTemplate.replace(EnvNamePlaceholder, env);
  const sourceFilePath = path.join(path.join(projectPath, folder), sourceFileName);

  const backupFileParentPath = path.join(backupFolder, folder);
  const res = await backupSrcFile(
    sourceFilePath,
    sourceFileName,
    backupFileParentPath,
    time,
    suffix
  );
  return res;
}

function generateBackupFileName(
  sourceFileName: string,
  backupFileFolder: string,
  suffix: string,
  time: string
): string {
  let fileNamePrefix =
    sourceFileName.substring(0, sourceFileName.length - suffix.length) + "." + time;

  if (
    os.type() === "Windows_NT" &&
    backupFileFolder.length + suffix.length + fileNamePrefix.length + 1 > windowsPathLengthLimit
  ) {
    fileNamePrefix = fileNamePrefix.substring(
      0,
      windowsPathLengthLimit - 1 - backupFileFolder.length - suffix.length
    );
  } else if (fileNamePrefix.length + suffix.length > fileNameLengthLimit) {
    fileNamePrefix = fileNamePrefix.substring(0, fileNameLengthLimit - suffix.length);
  }
  return fileNamePrefix + suffix;
}

async function copyFileToBackupFolderIfExists(
  sourceFile: string,
  targetFile: string,
  targetFolder: string
) {
  if (await fs.pathExists(sourceFile)) {
    await fs.ensureDir(targetFolder);
    await fs.copyFile(sourceFile, targetFile, fs.constants.COPYFILE_EXCL);
  }
}

function formatDate() {
  const date = new Date();
  return [
    date.getFullYear(),
    convertTo2Digits(date.getMonth() + 1),
    convertTo2Digits(date.getDate()),
    convertTo2Digits(date.getHours()),
    convertTo2Digits(date.getMinutes()),
    convertTo2Digits(date.getSeconds()),
  ].join("");
}

function convertTo2Digits(num: number) {
  return num.toString().padStart(2, "0");
}

async function generateReport(backupFolder: string, isVSPlatform: boolean, ctx: ResourceContextV3) {
  try {
    const target = path.join(backupFolder, reportName);
    const source = path.resolve(path.join(getResourceFolder(), reportName));
    if (!(await fs.pathExists(target))) {
      await fs.copyFile(source, target);
      if ((await fs.pathExists(target)) && !!ctx.userInteraction.openFile && isVSPlatform) {
        await ctx.userInteraction.openFile(target);
      }
    }
  } catch (error) {
    // do nothing
  }
}
