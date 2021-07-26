// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import * as path from "path";
import * as fs from "fs-extra";
import { ConfigFolderName } from "@microsoft/teamsfx-api";

const GlobalStateFileName = "state.json";

/**
 * Return a value.
 *
 * @param key A string.
 * @return The stored value or `undefined`.
 */
export function globalStateGet(key: string, defaultValue?: any): any {
  const filePath = getGlobalStateFile();
  ensureGlobalStateFileExists(filePath);

  const config = fs.readJSONSync(filePath);
  let value = config[key];
  if (value === undefined) {
    value = defaultValue;
  }
  return value;
}

/**
 * Store a value. The value must be JSON-stringifyable.
 *
 * @param key A string.
 * @param value A value. MUST not contain cyclic references.
 */
export async function globalStateUpdate(key: string, value: any): Promise<void> {
  const filePath = getGlobalStateFile();
  ensureGlobalStateFileExists(filePath);

  const config = await fs.readJSON(filePath);
  config[key] = value;
  await fs.writeJson(filePath, config);
}

function getGlobalStateFile(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, `.${ConfigFolderName}`, GlobalStateFileName);
}

function ensureGlobalStateFileExists(filePath: string): void {
  if (!fs.pathExistsSync(path.dirname(filePath))) {
    fs.mkdirpSync(path.dirname(filePath));
  }

  if (!fs.existsSync(filePath)) {
    fs.writeJSONSync(filePath, {});
  }
}
