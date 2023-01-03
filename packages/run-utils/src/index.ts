// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import Cryptr from "cryptr";
import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import path from "path";
import { parseDocument } from "yaml";

const settingsFolderName = "teamsfx";
const settingsFileName = "settings.json";
const projectYamlName = "teamsapp.yml";

async function readSettings(filePath: string): Promise<string> {
  if (!(await fs.pathExists(filePath))) {
    throw new Error(`${filePath} does not exist.`);
  }

  const settings = await fs.readJson(filePath);
  return settings.trackingId;
}

async function readYaml(filePath: string): Promise<string> {
  if (!(await fs.pathExists(filePath))) {
    throw new Error(`${filePath} does not exist.`);
  }

  const yamlFileContent: string = await fs.readFile(filePath, "utf8");
  const appYaml = parseDocument(yamlFileContent);
  return appYaml.get("projectId") as string;
}

/**
 * Load environment variables from a `.env` file and decrypt those which were encrypted by TeamsFx.
 *
 * @param {string} projectPath - The path of a TeamsFx project.
 * @param {string} envPath - The path of a `.env` file.
 *
 * @returns The environment variables loaded from `envPath` which has been decrypted.
 */
export async function loadEnv(
  projectPath: string,
  envPath: string
): Promise<{ [key: string]: string }> {
  if (!(await fs.pathExists(projectPath))) {
    throw new Error(`${projectPath} does not exist.`);
  }

  if (!(await fs.pathExists(envPath))) {
    throw new Error(`${envPath} does not exist.`);
  }

  const settingsPath = path.join(projectPath, settingsFolderName, settingsFileName);
  const yamlPath = path.join(projectPath, projectYamlName);
  let projectId = "";
  if (await fs.pathExists(settingsPath)) {
    projectId = await readSettings(settingsPath);
    if (!projectId) {
      throw new Error(`trackingId is missing in ${settingsFileName}`);
    }
  } else if (await fs.pathExists(yamlPath)) {
    projectId = await readYaml(yamlPath);
    if (!projectId) {
      throw new Error(`projectId is missing in ${projectYamlName}`);
    }
  } else {
    throw new Error("Not a TeamsFx project.");
  }

  const envs = dotenv.parse(await fs.readFile(envPath));
  const cryptr = new Cryptr(projectId + "_teamsfx");
  const secretPrefix = "crypto_";
  Object.keys(envs).forEach((key) => {
    if (key.startsWith("SECRET_") && envs[key].startsWith(secretPrefix)) {
      envs[key] = cryptr.decrypt(envs[key].substring(secretPrefix.length));
    }
  });

  return envs;
}
