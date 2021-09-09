// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError, UserError } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { basename } from "path";
import { promisify } from "util";
import { CoreSource, currentStage } from "../core";
import { Component, sendTelemetryErrorEvent, TelemetryEvent } from "./telemetry";

const sleep = promisify(setTimeout);

export async function readJson(filePath: string): Promise<any> {
  if(!await fs.pathExists(filePath)) {
    throw UserError.build(CoreSource, "FileNotFoundError", `File not found, make sure you don't move the original file: ${filePath}`);
  }
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
  const fxError: SystemError = SystemError.build(CoreSource, rawError as Error);
  fxError.name = "ReadJsonError";
  const fileName = basename(filePath);
  fxError.message = `task '${currentStage}' failed because of ${fxError.name}(file:${fileName}):${fxError.message}, if your local file 'env.*.json' is not modified, please report to us by click 'Report Issue' button.`;
  let content: string|undefined = undefined;
  try {
    content = fs.readFileSync(filePath, { encoding: "utf-8" });
  }
  catch(e){
  }
  if(content)
    fxError.userData = `file: ${fileName}\n------------FILE START--------\n${content}\n------------FILE END----------`;
  sendTelemetryErrorEvent(Component.core, TelemetryEvent.ReadJson, fxError);
  throw fxError;
}
