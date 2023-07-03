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
}
