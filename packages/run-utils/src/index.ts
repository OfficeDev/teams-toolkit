// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import Cryptr from "cryptr";
import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import path from "path";

interface Settings {
  version: string;
  trackingId: string;
}

const settingsFolderName = "teamsfx";
const settingsFileName = "settings.json";

async function readSettings(projectPath: string): Promise<Settings> {
  const settingsPath = path.join(projectPath, settingsFolderName, settingsFileName);
  if (!(await fs.pathExists(settingsPath))) {
    throw new Error(`${settingsPath} does not exist.`);
  }

  const settings: Settings = await fs.readJson(settingsPath);
  return settings;
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

  const settings = await readSettings(projectPath);
  if (!settings.trackingId) {
    throw new Error("trackingId is missing in settings.json");
  }

  const envs = dotenv.parse(await fs.readFile(envPath));
  const cryptr = new Cryptr(settings.trackingId + "_teamsfx");
  const secretPrefix = "crypto_";
  Object.keys(envs).forEach((key) => {
    if (key.startsWith("SECRET_") && envs[key].startsWith(secretPrefix)) {
      envs[key] = cryptr.decrypt(envs[key].substring(secretPrefix.length));
    }
  });

  return envs;
}
