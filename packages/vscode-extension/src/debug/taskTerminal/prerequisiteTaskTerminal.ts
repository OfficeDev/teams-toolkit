// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { FxError, Result, Void } from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core";
import { Prerequisite, TaskDefaultValue } from "@microsoft/teamsfx-core";
import VsCodeLogInstance from "../../commonlib/log";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import * as commonUtils from "../commonUtils";
import { DebugSessionExists, v3PrerequisiteCheckTaskDisplayMessages } from "../constants";
import {
  localTelemetryReporter,
  maskArrayValue,
  sendDebugAllStartEvent,
} from "../localTelemetryReporter";
import { checkAndInstallForTask } from "../prerequisitesHandler";
import { BaseTaskTerminal } from "./baseTaskTerminal";

interface PrerequisiteArgVxTestApp {
  version: string;
}

interface PrerequisiteArgs {
  prerequisites?: string[];
  portOccupancy?: number[];
  vxTestApp?: PrerequisiteArgVxTestApp;
}

export class PrerequisiteTaskTerminal extends BaseTaskTerminal {
  private readonly args: PrerequisiteArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as PrerequisiteArgs;
  }

  do(): Promise<Result<Void, FxError>> {
    const telemetryProperties = {
      [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
      [TelemetryProperty.DebugTaskArgs]: JSON.stringify({
        portOccupancy: maskArrayValue(
          this.args.portOccupancy?.map((p) => `${p}`),
          Object.values(TaskDefaultValue.checkPrerequisites.ports).map((p) => String(p))
        ),
        prerequisites: maskArrayValue(this.args.prerequisites, Object.values(Prerequisite)),
      }),
    };
    const additionalProperties: { [key: string]: string } = {
      [TelemetryProperty.DebugIsTransparentTask]: "true",
    };
    {
      // If we know this session is concurrently running with another session, send that correlationId in `debug-all-start` event.
      // Mostly, this happens when user stops debugging while preLaunchTasks are running and immediately hit F5 again.
      const session = commonUtils.getLocalDebugSession();
      if (session.id !== commonUtils.DebugNoSessionId) {
        additionalProperties[TelemetryProperty.DebugConcurrentCorrelationId] = session.id;
        // Indicates in which stage (of the first F5) the user hits F5 again.
        additionalProperties[TelemetryProperty.DebugConcurrentLastEventName] =
          localTelemetryReporter.getLastEventName();
      }
    }

    return Correlator.runWithId(commonUtils.startLocalDebugSession(), async () => {
      if (await commonUtils.checkAndSkipDebugging()) {
        throw new Error(DebugSessionExists);
      }
      await sendDebugAllStartEvent(additionalProperties);
      return await localTelemetryReporter.runWithTelemetryProperties(
        TelemetryEvent.DebugCheckPrerequisitesTask,
        telemetryProperties,
        () => this._do(telemetryProperties)
      );
    });
  }

  private async _do(telemetryProperties: {
    [key: string]: string;
  }): Promise<Result<Void, FxError>> {
    const res = await checkAndInstallForTask(
      this.args.prerequisites ?? [],
      this.args.portOccupancy,
      telemetryProperties
    );
    const duration = this.getDurationInSeconds();
    const displayMessages = v3PrerequisiteCheckTaskDisplayMessages;
    if (res.isOk() && duration) {
      VsCodeLogInstance.info(displayMessages.durationMessage(duration));
    }
    return res;
  }

  protected async stop(error?: any): Promise<void> {
    if (error) {
      if (error.message === DebugSessionExists) {
        // use a specical exit code to indicate this task is terminated as expected
        this.closeEmitter.fire(-1);
        return;
      }
    }
    await super.stop(error);
  }
}
