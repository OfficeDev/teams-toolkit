// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import * as fs from "fs-extra";
import { ConfigFolderName, FxError, IProgressHandler, LogLevel } from "@microsoft/teamsfx-api";
import * as dotenv from "dotenv";
import * as net from "net";

import * as constants from "./constants";
import { TaskResult } from "./task";
import cliLogger from "../../commonlib/log";
import { TaskFailed } from "./errors";
import cliTelemetry from "../../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../telemetry/cliTelemetryEvents";
import { getNpmInstallLogInfo } from "./npmLogHandler";
import { ServiceLogWriter } from "./serviceLogWriter";

export function createTaskStartCb(
  progressBar: IProgressHandler,
  startMessage: string,
  telemetryProperties?: { [key: string]: string }
): (taskTitle: string, background: boolean) => Promise<void> {
  return async (taskTitle: string, background: boolean) => {
    if (telemetryProperties !== undefined) {
      const event = background
        ? TelemetryEvent.PreviewServiceStart
        : TelemetryEvent.PreviewNpmInstallStart;
      const key = background
        ? TelemetryProperty.PreviewServiceName
        : TelemetryProperty.PreviewNpmInstallName;
      cliTelemetry.sendTelemetryEvent(event, {
        ...telemetryProperties,
        [key]: taskTitle as string,
      });
    }
    await progressBar.start(startMessage);
  };
}

export function createTaskStopCb(
  progressBar: IProgressHandler,
  successMessage: string,
  telemetryProperties?: { [key: string]: string }
): (
  taskTitle: string,
  background: boolean,
  result: TaskResult,
  serviceLogWriter?: ServiceLogWriter
) => Promise<FxError | null> {
  return async (
    taskTitle: string,
    background: boolean,
    result: TaskResult,
    serviceLogWriter?: ServiceLogWriter
  ) => {
    const event = background ? TelemetryEvent.PreviewService : TelemetryEvent.PreviewNpmInstall;
    const key = background
      ? TelemetryProperty.PreviewServiceName
      : TelemetryProperty.PreviewNpmInstallName;
    const success = background ? result.success : result.exitCode === 0;
    const properties = {
      ...telemetryProperties,
      [key]: taskTitle,
    };
    if (!background) {
      properties[TelemetryProperty.PreviewNpmInstallExitCode] =
        (result.exitCode === null ? undefined : result.exitCode) + "";
    }
    if (success) {
      if (telemetryProperties !== undefined) {
        cliTelemetry.sendTelemetryEvent(event, {
          ...properties,
          [TelemetryProperty.Success]: TelemetrySuccess.Yes,
        });
      }
      let message = successMessage;
      if (background) {
        const serviceLogFile = await serviceLogWriter?.getLogFile(taskTitle);
        if (serviceLogFile !== undefined) {
          message = `${successMessage} ${constants.serviceLogHintMessage} ${serviceLogFile}`;
        }
      }
      await progressBar.next(message);
      await progressBar.end();
      return null;
    } else {
      const error = TaskFailed(taskTitle);
      if (!background && telemetryProperties !== undefined) {
        const npmInstallLogInfo = await getNpmInstallLogInfo();
        if (
          npmInstallLogInfo?.cwd !== undefined &&
          result.options.cwd !== undefined &&
          path.relative(npmInstallLogInfo.cwd, result.options.cwd).length === 0 &&
          result.exitCode === npmInstallLogInfo.exitCode
        ) {
          properties[TelemetryProperty.PreviewNpmInstallNodeVersion] =
            npmInstallLogInfo.nodeVersion + "";
          properties[TelemetryProperty.PreviewNpmInstallNpmVersion] =
            npmInstallLogInfo.npmVersion + "";
          properties[TelemetryProperty.PreviewNpmInstallErrorMessage] =
            npmInstallLogInfo.errorMessage + "";
        }
      }
      if (telemetryProperties !== undefined) {
        cliTelemetry.sendTelemetryErrorEvent(event, error, properties);
      }
      cliLogger.necessaryLog(LogLevel.Error, `${error.source}.${error.name}: ${error.message}`);
      if (background) {
        const serviceLogFile = await serviceLogWriter?.getLogFile(taskTitle);
        if (serviceLogFile !== undefined) {
          cliLogger.necessaryLog(
            LogLevel.Info,
            `${constants.serviceLogHintMessage} ${serviceLogFile}`
          );
        }
      } else {
        if (result.stderr.length > 0) {
          cliLogger.necessaryLog(LogLevel.Info, result.stderr[result.stderr.length - 1], true);
        }
      }
      return error;
    }
  };
}

async function getLocalEnv(
  workspaceFolder: string,
  prefix = ""
): Promise<{ [key: string]: string } | undefined> {
  const localEnvFilePath: string = path.join(
    workspaceFolder,
    `.${ConfigFolderName}`,
    constants.localEnvFileName
  );
  if (!(await fs.pathExists(localEnvFilePath))) {
    return undefined;
  }

  const contents = await fs.readFile(localEnvFilePath);
  const env: dotenv.DotenvParseOutput = dotenv.parse(contents);

  const result: { [key: string]: string } = {};
  for (const key of Object.keys(env)) {
    if (key.startsWith(prefix) && env[key]) {
      result[key.slice(prefix.length)] = env[key];
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export async function getFrontendLocalEnv(
  workspaceFolder: string
): Promise<{ [key: string]: string } | undefined> {
  return getLocalEnv(workspaceFolder, constants.frontendLocalEnvPrefix);
}

export async function getBackendLocalEnv(
  workspaceFolder: string
): Promise<{ [key: string]: string } | undefined> {
  return getLocalEnv(workspaceFolder, constants.backendLocalEnvPrefix);
}

export async function getAuthLocalEnv(
  workspaceFolder: string
): Promise<{ [key: string]: string } | undefined> {
  // SERVICE_PATH will also be included, but it has no side effect
  return getLocalEnv(workspaceFolder, constants.authLocalEnvPrefix);
}

export async function getAuthServicePath(workspaceFolder: string): Promise<string | undefined> {
  const result = await getLocalEnv(workspaceFolder);
  return result ? result[constants.authServicePathEnvKey] : undefined;
}

export async function getBotLocalEnv(
  workspaceFolder: string
): Promise<{ [key: string]: string } | undefined> {
  return getLocalEnv(workspaceFolder, constants.botLocalEnvPrefix);
}

async function detectPortListeningImpl(port: number, host: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
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
      // ignore any error to not block preview
      resolve(false);
    }
  });
}

export async function detectPortListening(port: number, hosts: string[]): Promise<boolean> {
  for (const host of hosts) {
    if (await detectPortListeningImpl(port, host)) {
      return true;
    }
  }
  return false;
}

export async function getPortsInUse(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean
): Promise<number[]> {
  const ports: [number, string[]][] = [];
  if (includeFrontend) {
    ports.push(...constants.frontendPorts);
  }
  if (includeBackend) {
    ports.push(...constants.backendPorts);
  }
  if (includeBot) {
    ports.push(...constants.botPorts);
  }

  const portsInUse: number[] = [];
  for (const port of ports) {
    if (await detectPortListening(port[0], port[1])) {
      portsInUse.push(port[0]);
    }
  }
  return portsInUse;
}

export function mergeProcessEnv(
  env: { [key: string]: string | undefined } | undefined
): { [key: string]: string | undefined } | undefined {
  if (env === undefined) {
    return process.env;
  }
  const result = Object.assign({}, process.env);
  for (const key of Object.keys(env)) {
    result[key] = env[key];
  }
  return result;
}
