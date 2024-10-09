// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, Inputs } from "@microsoft/teamsfx-api";
import { DriverContext } from "../component/driver/interface/commonArgs";
import axios from "axios";
import fs from "fs-extra";

export async function waitSeconds(second: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, second * 1000));
}

export function generateDriverContext(ctx: Context, inputs: Inputs): DriverContext {
  return {
    azureAccountProvider: ctx.tokenProvider!.azureAccountProvider,
    m365TokenProvider: ctx.tokenProvider!.m365TokenProvider,
    ui: ctx.userInteraction,
    progressBar: undefined,
    logProvider: ctx.logProvider,
    telemetryReporter: ctx.telemetryReporter,
    projectPath: ctx.projectPath!,
    platform: inputs.platform,
  };
}

export async function isJsonSpecFile(filePath: string): Promise<boolean> {
  const specPath = filePath.toLowerCase();
  if (specPath.endsWith(".yaml") || specPath.endsWith(".yml")) {
    return false;
  } else if (specPath.endsWith(".json")) {
    return true;
  }
  const isRemoteFile = specPath.startsWith("http:") || specPath.startsWith("https:");
  const fileContent = isRemoteFile
    ? (await axios.get(specPath)).data
    : await fs.readFile(specPath, "utf-8");

  try {
    JSON.parse(fileContent);
    return true;
  } catch (error) {
    return false;
  }
}
