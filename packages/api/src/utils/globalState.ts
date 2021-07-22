// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import * as path from "path";
import * as fs from "fs-extra";
import { Result, Err, ok, err } from "neverthrow";
import { FxError, returnSystemError } from "../error";
import { ConfigFolderName } from "../constants";

const GlobalStateFileName = "state.json";

/**
 * Return a value.
 *
 * @param key A string.
 * @return The stored value or `undefined`.
 */
export async function globalStateGet(key: string): Promise<Result<any, FxError>> {
  const filePath = getGlobalStateFile();
  try {
    await ensureGlobalStateFileExists();
  } catch (e) {
    return globalStateError(e);
  }

  try {
    const config = await fs.readJSON(filePath);
    return ok(config[key]);
  } catch (e) {
    return globalStateError(e);
  }
}

/**
 * Store a value. The value must be JSON-stringifyable.
 *
 * @param key A string.
 * @param value A value. MUST not contain cyclic references.
 */
export async function globalStateUpdate(key: string, value: any): Promise<Result<null, FxError>> {
  const filePath = getGlobalStateFile();
  try {
    await ensureGlobalStateFileExists();
  } catch (e) {
    return globalStateError(e);
  }

  try {
    const config = await fs.readJSON(filePath);
    config[key] = value;
    return ok(null);
  } catch (e) {
    return globalStateError(e);
  }
}

function getGlobalStateFile(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, `.${ConfigFolderName}`, GlobalStateFileName);
}

function globalStateError(e: any): Err<any, FxError> {
  return err(returnSystemError(e, "API", "GlobalStateFileError"));
}

async function ensureGlobalStateFileExists(): Promise<void> {
  const filePath = getGlobalStateFile();
  if (!(await fs.pathExists(path.dirname(filePath)))) {
    await fs.mkdirp(path.dirname(filePath));
  }

  if (!fs.existsSync(filePath)) {
    await fs.writeJSON(filePath, {});
  }
}
