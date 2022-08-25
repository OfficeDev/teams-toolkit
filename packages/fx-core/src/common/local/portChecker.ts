// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { LogProvider, ProjectSettings, UserError } from "@microsoft/teamsfx-api";
import * as path from "path";
import detectPort from "detect-port";

import { FolderName } from "./constants";
import { loadTeamsFxDevScript } from "./packageJsonHelper";
import { ProjectSettingsHelper } from "./projectSettingsHelper";
import { CoreSource } from "../../core/error";
import {
  Component,
  sendTelemetryErrorEvent,
  sendTelemetryEvent,
  TelemetryEvent,
} from "../telemetry";

const frontendPorts = [53000];
const simpleAuthPorts = [55000];
const backendDebugPortRegex = /--inspect[\s]*=[\s"']*9229/im;
const backendDebugPorts = [9229];
const backendServicePortRegex = /--port[\s"']*7071/im;
const backendServicePorts = [7071];
const botDebugPortRegex = /--inspect[\s]*=[\s"']*9239/im;
const botDebugPorts = [9239];
const botServicePorts = [3978];

async function detectPortListening(port: number, logger?: LogProvider): Promise<boolean> {
  try {
    sendTelemetryEvent(Component.core, TelemetryEvent.DetectPortStart, { port: port.toString() });
    const race = Promise.race([
      detectPort(port),
      // in case `detectPort` hangs, set 10 seconds timeout
      new Promise<number>((resolve) => setTimeout(() => resolve(port), 10 * 1000)),
    ]);
    const portChosen = await race;
    sendTelemetryEvent(Component.core, TelemetryEvent.DetectPort, {
      portChosen: portChosen.toString(),
      port: port.toString(),
    });
    return portChosen !== port;
  } catch (error: any) {
    // ignore any error to not block debugging
    sendTelemetryErrorEvent(
      Component.core,
      TelemetryEvent.DetectPort,
      new UserError({ error, source: CoreSource, name: "DetectPortError" })
    );
    logger?.warning(`Failed to detect port. ${error?.message} `);
    return false;
  }
}

export async function getPortsFromProject(
  projectPath: string,
  projectSettings: ProjectSettings,
  ignoreDebugPort?: boolean
): Promise<number[]> {
  const ports: number[] = [];

  const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
  if (includeFrontend) {
    ports.push(...frontendPorts);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);
    if (includeSimpleAuth) {
      ports.push(...simpleAuthPorts);
    }
  }

  const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
  if (includeBackend) {
    ports.push(...backendServicePorts);
    if (!(ignoreDebugPort === true)) {
      const backendDevScript = await loadTeamsFxDevScript(
        path.join(projectPath, FolderName.Function)
      );
      if (backendDevScript === undefined || backendDebugPortRegex.test(backendDevScript)) {
        ports.push(...backendDebugPorts);
      }
    }
  }
  const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
  if (includeBot) {
    ports.push(...botServicePorts);
    if (!(ignoreDebugPort === true)) {
      const botDevScript = await loadTeamsFxDevScript(path.join(projectPath, FolderName.Bot));
      if (botDevScript === undefined || botDebugPortRegex.test(botDevScript)) {
        ports.push(...botDebugPorts);
      }
    }
  }

  return ports;
}

export async function getPortsInUse(ports: number[], logger?: LogProvider): Promise<number[]> {
  const portsInUse: number[] = [];
  for (const port of ports) {
    if (await detectPortListening(port, logger)) {
      portsInUse.push(port);
    }
  }
  return portsInUse;
}
