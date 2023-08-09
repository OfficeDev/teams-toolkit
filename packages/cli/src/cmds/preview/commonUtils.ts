// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Colors, FxError, IProgressHandler, LogLevel } from "@microsoft/teamsfx-api";
import * as path from "path";
import { LocalEnvManager } from "@microsoft/teamsfx-core";
import open from "open";
import cliLogger from "../../commonlib/log";
import cliTelemetry from "../../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../telemetry/cliTelemetryEvents";
import { getColorizedString } from "../../utils";
import * as constants from "./constants";
import { isWindows } from "./depsChecker/cliUtils";
import { TaskFailed } from "./errors";
import { ServiceLogWriter } from "./serviceLogWriter";
import { TaskResult } from "./task";
export async function openBrowser(
  browser: constants.Browser,
  url: string,
  browserArguments: string[] = []
): Promise<void> {
  switch (browser) {
    case constants.Browser.chrome:
      await open(url, {
        app: {
          name: open.apps.chrome,
          arguments: browserArguments,
        },
      });
      break;
    case constants.Browser.edge:
      await open(url, {
        app: {
          name: open.apps.edge,
          arguments: browserArguments,
        },
      });
      break;
    case constants.Browser.default:
      await open(url);
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
        const localEnvManager = new LocalEnvManager(cliLogger, cliTelemetry.reporter);
        const npmInstallLogInfo = await localEnvManager.getNpmInstallLogInfo();
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

export function mergeProcessEnv(
  env: { [key: string]: string | undefined } | undefined
): { [key: string]: string | undefined } | undefined {
  if (env === undefined) {
    return process.env;
  }
  const result = Object.assign({}, process.env);
  for (const key of Object.keys(env)) {
    if (isWindows()) {
      let targetKey = Object.keys(result).find(
        (value) => value.toLowerCase() === key.toLowerCase()
      );
      targetKey = targetKey ?? key;
      result[targetKey] = env[key];
    } else {
      result[key] = env[key];
    }
  }
  return result;
}
