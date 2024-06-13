// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LocalEnvManager, MetadataV3 } from "@microsoft/teamsfx-core";
import * as fs from "fs-extra";
import * as path from "path";
import * as uuid from "uuid";
import VsCodeLogInstance from "../commonlib/log";
import { workspaceUri } from "../globalVariables";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { allRunningDebugSessions } from "./teamsfxTaskHandler";

export async function getNpmInstallLogInfo(): Promise<any> {
  const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
  return await localEnvManager.getNpmInstallLogInfo();
}

export async function getTestToolLogInfo(): Promise<string | undefined> {
  const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
  if (!workspaceUri?.fsPath) {
    return undefined;
  }
  return await localEnvManager.getTestToolLogInfo(workspaceUri?.fsPath);
}

export class LocalDebugSession {
  static createSession() {
    const session = new LocalDebugSession(uuid.v4());
    return session;
  }
  static createInvalidSession() {
    return new LocalDebugSession();
  }

  readonly id: string;
  // Save the time when the event it sent for calculating time gaps.
  readonly eventTimes: { [eventName: string]: number | undefined } = {};
  readonly properties: { [key: string]: string } = {};
  readonly errorProps: string[] = [];
  readonly failedServices: { name: string; exitCode: number | undefined }[] = [];

  private constructor(id: string = DebugNoSessionId) {
    this.id = id;
  }
}

export const DebugNoSessionId = "no-session-id";
// Helper functions for local debug correlation-id, only used for telemetry
// Use a 2-element tuple to handle concurrent F5
const localDebugCorrelationIds: [LocalDebugSession, LocalDebugSession] = [
  LocalDebugSession.createInvalidSession(),
  LocalDebugSession.createInvalidSession(),
];
let current = 0;
export function startLocalDebugSession(): string {
  current = (current + 1) % 2;
  localDebugCorrelationIds[current] = LocalDebugSession.createSession();
  return getLocalDebugSessionId();
}

export function endLocalDebugSession() {
  localDebugCorrelationIds[current] = LocalDebugSession.createInvalidSession();
  current = (current + 1) % 2;
}

export function getLocalDebugSession(): LocalDebugSession {
  return localDebugCorrelationIds[current];
}

export function getLocalDebugSessionId(): string {
  return localDebugCorrelationIds[current].id;
}

export async function checkAndSkipDebugging(): Promise<boolean> {
  // skip debugging if there is already a debug session
  if (allRunningDebugSessions.size > 0) {
    VsCodeLogInstance.warning("Skip debugging because there is already a debug session.");
    endLocalDebugSession();
    return Promise.resolve(true);
  }
  return Promise.resolve(false);
}

export class Step {
  private currentStep: number;
  public readonly totalSteps: number;
  constructor(totalSteps: number) {
    this.currentStep = 1;
    this.totalSteps = totalSteps;
  }

  getPrefix(): string {
    return `(${this.currentStep++}/${this.totalSteps})`;
  }
}

// Only work in ts/js project
export function isTestToolEnabledProject(workspacePath: string): boolean {
  const testToolYmlPath = path.join(workspacePath, MetadataV3.testToolConfigFile);
  if (fs.pathExistsSync(testToolYmlPath)) {
    return true;
  }
  return false;
}
