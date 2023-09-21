// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { LogProvider, TelemetryReporter, UserInteraction } from "@microsoft/teamsfx-api";
import * as commentJson from "comment-json";
import * as fs from "fs-extra";
import * as path from "path";

import { getNpmInstallLogInfo, NpmInstallLogInfo } from "./npmLogHelper";
import { getPortsInUse } from "./portChecker";

export class LocalEnvManager {
  private readonly logger: LogProvider | undefined;
  private readonly telemetry: TelemetryReporter | undefined;
  private readonly ui: UserInteraction | undefined;

  constructor(logger?: LogProvider, telemetry?: TelemetryReporter, ui?: UserInteraction) {
    this.logger = logger;
    this.telemetry = telemetry;
    this.ui = ui;
  }

  public async getNpmInstallLogInfo(): Promise<NpmInstallLogInfo | undefined> {
    return await getNpmInstallLogInfo();
  }

  public async getPortsInUse(ports: number[]): Promise<number[]> {
    return await getPortsInUse(ports, this.logger);
  }

  public async getTaskJson(projectPath: string): Promise<any> {
    try {
      const taskFilePath = path.resolve(projectPath, ".vscode", "tasks.json");
      const content = await fs.readFile(taskFilePath, "utf-8");
      return commentJson.parse(content);
    } catch {
      return undefined;
    }
  }

  // Test Tool log format:
  //  error Some error happens
  //  warn Some warning happens
  public async getTestToolLogInfo(projectPath: string): Promise<string | undefined> {
    const logPath = path.resolve(projectPath, "devTools", "teamsapptesttool.log");
    const resultLines: string[] = [];
    try {
      const logs = await fs.readFile(logPath, "utf-8");
      // send only error logs without multi-line stack to minimize GDPR issue
      for (const line of logs.split(/\r?\n/)) {
        if (line.match(/^error .*/i)) {
          resultLines.push(line);
        }
      }
      return resultLines.join("\n");
    } catch {
      // ignore telemetry error
      return undefined;
    }
  }
}
