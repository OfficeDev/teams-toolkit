import {
  ConfigFolderName,
  EnvNamePlaceholder,
  Err,
  FxError,
  SolutionContext,
  StatesFolderName,
  Void,
} from "@microsoft/teamsfx-api";
import { ok } from "assert";
import path from "path";

const configsFolder = `.${ConfigFolderName}/configs`;
const azureParameterFileNameTemplate = `azure.parameters.${EnvNamePlaceholder}.json`;
const stateFolder = `.${ConfigFolderName}/states`;
const stateFileNameTemplate = `state.${EnvNamePlaceholder}.json`;
const suffix = ".json";

export async function backupFiles(
  ctx: SolutionContext,
  env: string,
  doesNeedBackupAzureParameters: boolean,
  projectPath: string
) {
  const parameterFolderPath = path.join(projectPath, configsFolder);
  const azureParameterFileName = azureParameterFileNameTemplate.replace(EnvNamePlaceholder, env);
  const backUpAzureParameterFileName = generateBackupFileName(azureParameterFileName, suffix);

  const envInfoFileName = stateFileNameTemplate.replace(EnvNamePlaceholder, env);
  const backupEnvInfoFileName = generateBackupFileName(envInfoFileName, suffix);
  return ok([]);
}

function generateBackupFileName(originalFileName: string, originalFileNameSuffix: string) {
  return (
    originalFileName.substring(0, originalFileName.length - originalFileNameSuffix.length) +
    "." +
    formatDate +
    originalFileNameSuffix
  );
}

function formatDate() {
  const date = new Date();
  return [
    date.getUTCFullYear(),
    convertTo2Digits(date.getUTCMonth() + 1),
    convertTo2Digits(date.getUTCDate() + 1),
    convertTo2Digits(date.getUTCHours() + 1),
    convertTo2Digits(date.getUTCMinutes() + 1),
    convertTo2Digits(date.getUTCSeconds() + 1),
  ].join("");
}

function convertTo2Digits(num: number) {
  return num.toString().padStart(2, "0");
}
