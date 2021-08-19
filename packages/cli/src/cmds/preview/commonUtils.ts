// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import * as fs from "fs-extra";
import {
  Colors,
  ConfigFolderName,
  Func,
  FxError,
  IProgressHandler,
  LogLevel,
} from "@microsoft/teamsfx-api";
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
import open from "open";
import { FxCore, isMultiEnvEnabled } from "@microsoft/teamsfx-core";
import { getSystemInputs, getColorizedString } from "../../utils";

export async function openBrowser(browser: constants.Browser, url: string): Promise<void> {
  switch (browser) {
    case constants.Browser.chrome:
      await open(url, {
        app: {
          name: open.apps.chrome,
        },
        wait: true,
        allowNonzeroExitCode: true,
      });
      break;
    case constants.Browser.edge:
      await open(url, {
        app: {
          name: open.apps.edge,
        },
        wait: true,
        allowNonzeroExitCode: true,
      });
      break;
    case constants.Browser.default:
      await open(url, {
        wait: true,
      });
      break;
  }
}

export function createTaskStartCb(
  progressBar: IProgressHandler,
  startMessage: string,
  telemetryProperties?: { [key: string]: string }
): (taskTitle: string, background: boolean) => Promise<void> {
  return async (taskTitle: string, background: boolean, serviceLogWriter?: ServiceLogWriter) => {
    if (telemetryProperties !== undefined) {
      let event = background
        ? TelemetryEvent.PreviewServiceStart
        : TelemetryEvent.PreviewNpmInstallStart;
      let key = background
        ? TelemetryProperty.PreviewServiceName
        : TelemetryProperty.PreviewNpmInstallName;
      if (taskTitle === constants.gulpCertTitle) {
        event = TelemetryEvent.PreviewGulpCertStart;
        key = TelemetryProperty.PreviewGulpCertName;
      }
      cliTelemetry.sendTelemetryEvent(event, {
        ...telemetryProperties,
        [key]: taskTitle as string,
      });
    }
    await progressBar.start(startMessage);
    if (background) {
      const serviceLogFile = await serviceLogWriter?.getLogFile(taskTitle);
      if (serviceLogFile !== undefined) {
        const message = [
          {
            content: `${taskTitle}: ${constants.serviceLogHintMessage} `,
            color: Colors.WHITE,
          },
          {
            content: serviceLogFile,
            color: Colors.BRIGHT_GREEN,
          },
        ];
        cliLogger.necessaryLog(LogLevel.Info, getColorizedString(message));
      }
    }
    await progressBar.next(startMessage);
  };
}

export function createTaskStopCb(
  progressBar: IProgressHandler,
  telemetryProperties?: { [key: string]: string }
): (
  taskTitle: string,
  background: boolean,
  result: TaskResult,
  serviceLogWriter?: ServiceLogWriter
) => Promise<FxError | null> {
  return async (taskTitle: string, background: boolean, result: TaskResult) => {
    const timestamp = new Date();
    const ifNpmInstall: boolean = taskTitle.includes("npm install");
    let event = background ? TelemetryEvent.PreviewService : TelemetryEvent.PreviewNpmInstall;
    let key = background
      ? TelemetryProperty.PreviewServiceName
      : TelemetryProperty.PreviewNpmInstallName;
    if (taskTitle === constants.gulpCertTitle) {
      event = TelemetryEvent.PreviewGulpCert;
      key = TelemetryProperty.PreviewGulpCertName;
    }
    const success = background ? result.success : result.exitCode === 0;
    const properties = {
      ...telemetryProperties,
      [key]: taskTitle,
    };
    if (!background && ifNpmInstall) {
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
      await progressBar.end(true);
      return null;
    } else {
      const error = TaskFailed(taskTitle);
      if (!background && ifNpmInstall && telemetryProperties !== undefined) {
        const npmInstallLogInfo = await getNpmInstallLogInfo();
        let validNpmInstallLogInfo = false;
        if (
          npmInstallLogInfo?.cwd !== undefined &&
          result.options?.cwd !== undefined &&
          path.relative(npmInstallLogInfo.cwd, result.options.cwd).length === 0 &&
          result.exitCode === npmInstallLogInfo.exitCode
        ) {
          const timeDiff = timestamp.getTime() - npmInstallLogInfo.timestamp.getTime();
          if (timeDiff >= 0 && timeDiff <= 20000) {
            validNpmInstallLogInfo = true;
          }
        }
        if (validNpmInstallLogInfo) {
          properties[TelemetryProperty.PreviewNpmInstallNodeVersion] =
            npmInstallLogInfo?.nodeVersion + "";
          properties[TelemetryProperty.PreviewNpmInstallNpmVersion] =
            npmInstallLogInfo?.npmVersion + "";
          properties[TelemetryProperty.PreviewNpmInstallErrorMessage] =
            npmInstallLogInfo?.errorMessage + "";
        }
      }
      if (telemetryProperties !== undefined) {
        cliTelemetry.sendTelemetryErrorEvent(event, error, properties);
      }
      cliLogger.necessaryLog(LogLevel.Error, `${error.source}.${error.name}: ${error.message}`);
      if (!background) {
        if (result.stderr.length > 0) {
          cliLogger.necessaryLog(LogLevel.Info, result.stderr[result.stderr.length - 1], true);
        }
      }
      await progressBar.end(false);
      return error;
    }
  };
}

async function getLocalEnv(
  core: FxCore,
  workspaceFolder: string,
  prefix = ""
): Promise<{ [key: string]: string } | undefined> {
  const localEnvFilePath: string = path.join(
    workspaceFolder,
    `.${ConfigFolderName}`,
    constants.localEnvFileName
  );
  let env: { [name: string]: string };

  if (isMultiEnvEnabled()) {
    // use localSettings.json as input to generate the local debug envs
    const func: Func = {
      namespace: "fx-solution-azure/fx-resource-local-debug",
      method: "getLocalDebugEnvs",
    };
    const inputs = getSystemInputs(workspaceFolder, undefined, "local");
    inputs.ignoreLock = true;
    inputs.ignoreConfigPersist = true;
    const result = await core.executeUserTask(func, inputs);
    if (result.isErr()) {
      throw result.error;
    }

    env = result.value as Record<string, string>;
  } else {
    // use local.env file as input to generate the local debug envs
    if (!(await fs.pathExists(localEnvFilePath))) {
      return undefined;
    }

    const contents = await fs.readFile(localEnvFilePath);
    env = dotenv.parse(contents);
  }

  const result: { [key: string]: string } = {};
  for (const key of Object.keys(env)) {
    if (key.startsWith(prefix) && env[key]) {
      result[key.slice(prefix.length)] = env[key];
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export async function getFrontendLocalEnv(
  core: FxCore,
  workspaceFolder: string
): Promise<{ [key: string]: string } | undefined> {
  return getLocalEnv(core, workspaceFolder, constants.frontendLocalEnvPrefix);
}

export async function getBackendLocalEnv(
  core: FxCore,
  workspaceFolder: string
): Promise<{ [key: string]: string } | undefined> {
  return getLocalEnv(core, workspaceFolder, constants.backendLocalEnvPrefix);
}

export async function getAuthLocalEnv(
  core: FxCore,
  workspaceFolder: string
): Promise<{ [key: string]: string } | undefined> {
  // SERVICE_PATH will also be included, but it has no side effect
  return getLocalEnv(core, workspaceFolder, constants.authLocalEnvPrefix);
}

export async function getAuthServicePath(
  core: FxCore,
  workspaceFolder: string
): Promise<string | undefined> {
  const result = await getLocalEnv(core, workspaceFolder);
  return result ? result[constants.authServicePathEnvKey] : undefined;
}

export async function getBotLocalEnv(
  core: FxCore,
  workspaceFolder: string
): Promise<{ [key: string]: string } | undefined> {
  return getLocalEnv(core, workspaceFolder, constants.botLocalEnvPrefix);
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
