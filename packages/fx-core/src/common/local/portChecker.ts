// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ProjectSettings } from "@microsoft/teamsfx-api";
import * as net from "net";
import * as path from "path";

import { FolderName } from "./constants";
import { loadTeamsFxDevScript } from "./packageJsonHelper";
import { ProjectSettingsHelper } from "./projectSettingsHelper";

const allAddressIPv4 = "0.0.0.0";
const allAddressIPv6 = "::";
const loopbackAddressIPv4 = "127.0.0.1";
const loopbackAddressIPv6 = "::1";
const hosts = [allAddressIPv4, loopbackAddressIPv4, allAddressIPv6, loopbackAddressIPv6];

const frontendPortsV1: [number, string[]][] = [[3000, hosts]];
const frontendPorts: [number, string[]][] = [[53000, hosts]];
const simpleAuthPorts: [number, string[]][] = [[55000, hosts]];
const backendDebugPortRegex = /--inspect[\s]*=[\s"']*9229/im;
const backendDebugPorts: [number, string[]][] = [[9229, hosts]];
const backendServicePortRegex = /--port[\s"']*7071/im;
const backendServicePorts: [number, string[]][] = [[7071, hosts]];
const botDebugPortRegex = /--inspect[\s]*=[\s"']*9239/im;
const botDebugPorts: [number, string[]][] = [[9239, hosts]];
const botServicePorts: [number, string[]][] = [[3978, hosts]];

async function detectPortListeningOnHosts(port: number, hosts: string[]): Promise<boolean> {
  for (const host of hosts) {
    if (await detectPortListening(port, host)) {
      return true;
    }
  }
  return false;
}

async function detectPortListening(port: number, host: string): Promise<boolean> {
  return new Promise<boolean>((resolve, _reject) => {
    try {
      const server = net.createServer();
      server
        .once("error", (err) => {
          if (err.message.includes("EADDRINUSE")) {
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .once("listening", () => {
          server.close();
        })
        .once("close", () => {
          resolve(false);
        })
        .listen(port, host);
    } catch (err) {
      // ignore any error to not block debugging
      resolve(false);
    }
  });
}

export async function getPortsInUse(
  projectPath: string,
  projectSettings: ProjectSettings
): Promise<number[]> {
  const ports: [number, string[]][] = [];

  const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
  if (includeFrontend) {
    const migrateFromV1 = ProjectSettingsHelper.isMigrateFromV1(projectSettings);
    if (!migrateFromV1) {
      ports.push(...frontendPorts);
      ports.push(...simpleAuthPorts);
    } else {
      ports.push(...frontendPortsV1);
    }
  }

  const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
  if (includeBackend) {
    ports.push(...backendServicePorts);
    const backendDevScript = await loadTeamsFxDevScript(
      path.join(projectPath, FolderName.Function)
    );
    if (backendDevScript === undefined || backendDebugPortRegex.test(backendDevScript)) {
      ports.push(...backendDebugPorts);
    }
  }
  const includeBot = await ProjectSettingsHelper.includeBot(projectSettings);
  if (includeBot) {
    ports.push(...botServicePorts);
    const botDevScript = await loadTeamsFxDevScript(path.join(projectPath, FolderName.Bot));
    if (botDevScript === undefined || botDebugPortRegex.test(botDevScript)) {
      ports.push(...botDebugPorts);
    }
  }

  const portsInUse: number[] = [];
  for (const port of ports) {
    if (await detectPortListeningOnHosts(port[0], port[1])) {
      portsInUse.push(port[0]);
    }
  }
  return portsInUse;
}
