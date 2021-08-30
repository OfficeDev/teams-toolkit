// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import { basename } from "path";
import { promisify } from "util";
import { assembleError, SystemError } from "@microsoft/teamsfx-api";
import { CoreSource, currentStage } from "../core";
import { Component, sendTelemetryErrorEvent, TelemetryEvent } from "./telemetry";

const sleep = promisify(setTimeout);

export async function readJson(filePath: string): Promise<any> {
  let rawError;
  for (let i = 0; i < 5; ++i) {
    try {
      const json = await fs.readJson(filePath);
      return json;
    } catch (error) {
      rawError = error;
      await sleep(100);
    }
  }
  /**
   * failed, read raw content into userData field, which will be reported in issue body
   */
  const fxError: SystemError = assembleError(rawError);
  fxError.source = CoreSource;
  fxError.name = "ReadJsonError";
  const fileName = basename(filePath);
  fxError.message = `task '${currentStage}' failed because of ${fxError.name}(file:${fileName}):${fxError.message}, if your local file 'env.*.json' is not modified, please report to us by click 'Report Issue' button.`;
  const content = fs.readFileSync(filePath, { encoding: "utf-8" });
  fxError.userData = `file: ${fileName}\n------------FILE START--------\n${content}\n------------FILE END----------`;
  sendTelemetryErrorEvent(Component.core, TelemetryEvent.ReadJson, fxError);
  throw fxError;
}

export async function checkFileExist(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}
