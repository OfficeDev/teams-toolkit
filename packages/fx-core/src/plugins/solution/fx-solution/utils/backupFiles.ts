import {
  ConfigFolderName,
  EnvNamePlaceholder,
  err,
  FxError,
  ok,
  Result,
  UserError,
} from "@microsoft/teamsfx-api";
import path from "path";
import fs from "fs-extra";
import { SolutionError, SolutionSource } from "../constants";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const configFolder = `.${ConfigFolderName}/configs`;
const azureParameterFileNameTemplate = `azure.parameters.${EnvNamePlaceholder}.json`;
const stateFolder = `.${ConfigFolderName}/states`;
const stateFileNameTemplate = `state.${EnvNamePlaceholder}.json`;
const userDateFileNameTemplate = `${EnvNamePlaceholder}.userdata`;

export async function backupFiles(
  env: string,
  projectPath: string
): Promise<Result<undefined, FxError>> {
  const time = formatDate();
  const backupFolder = path.join(projectPath, path.join(`.${ConfigFolderName}/backup`, time));

  // state file
  const stateFileBackupRes = await backupFile(
    projectPath,
    env,
    stateFileNameTemplate,
    stateFolder,
    backupFolder
  );
  if (stateFileBackupRes.isErr()) {
    return err(stateFileBackupRes.error);
  }

  // user data file
  const userDataFileBackupRes = await backupFile(
    projectPath,
    env,
    userDateFileNameTemplate,
    stateFolder,
    backupFolder
  );
  if (userDataFileBackupRes.isErr()) {
    return err(userDataFileBackupRes.error);
  }

  // Azure parameter file
  if (env !== "local") {
    const azureParameterFileBackupRes = await backupFile(
      projectPath,
      env,
      azureParameterFileNameTemplate,
      configFolder,
      backupFolder
    );

    if (azureParameterFileBackupRes.isErr()) {
      return err(azureParameterFileBackupRes.error);
    }
  }

  return ok(undefined);
}

async function backupFile(
  projectPath: string,
  env: string,
  fileNameTemplate: string,
  folder: string,
  backupFolder: string
): Promise<Result<undefined, FxError>> {
  const sourceFileName = fileNameTemplate.replace(EnvNamePlaceholder, env);
  const sourceFile = path.join(path.join(projectPath, folder), sourceFileName);
  try {
    const backupFile = path.join(backupFolder, sourceFileName);
    await copyFileToBackupFolderIfExists(sourceFile, backupFile, backupFolder);
    return ok(undefined);
  } catch (exception) {
    const error = new UserError(
      SolutionSource,
      SolutionError.FailedToBackupFiles,
      getDefaultString("core.backupFiles.FailedToBackupFiles", sourceFile),
      getLocalizedString("core.backupFiles.FailedToBackupFiles", sourceFile)
    );
    return err(error);
  }
}

async function copyFileToBackupFolderIfExists(
  sourceFile: string,
  targetFile: string,
  targetFolder: string
) {
  if (await fs.pathExists(sourceFile)) {
    await fs.ensureDir(targetFolder);
    await fs.copyFile(sourceFile, targetFile);
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
