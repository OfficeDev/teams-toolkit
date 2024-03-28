// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CancellationToken,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatUserMessage,
} from "vscode";

import { OfficeAddinChatCommand } from "../consts";
import { ISkill } from "./skills/iSkill";
import { SkillsManager } from "./skills/skillsManager";
import { Spec } from "./skills/spec";
import { ICopilotChatResult, ITelemetryData } from "../types";
import { ChatTelemetryData } from "../telemetry";
import { TelemetryEvent } from "../../telemetry/extTelemetryEvents";
import { ExtTelemetry } from "../../telemetry/extTelemetry";
import { ExecutionResultEnum } from "./skills/executionResultEnum";
import {
  MeasurementCommandExcutionTimeSec,
  PropertySystemFailureFromSkill,
  PropertySystemRequesRejected,
  PropertySystemRequestCancelled,
  PropertySystemRequestFailed,
  PropertySystemRequestSucceeded,
} from "./telemetryConsts";
import { deepClone } from "./Utils";

export class Planner {
  private static instance: Planner;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): Planner {
    if (!Planner.instance) {
      Planner.instance = new Planner();
    }
    return Planner.instance;
  }

  public async processRequest(
    languageModel: LanguageModelChatUserMessage,
    request: ChatRequest,
    response: ChatResponseStream,
    token: CancellationToken,
    command: OfficeAddinChatCommand
  ): Promise<ICopilotChatResult> {
    const candidates: ISkill[] = SkillsManager.getInstance().getCapableSkills(command);
    const chatTelemetryData = ChatTelemetryData.createByCommand(command);
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CopilotChatStart, chatTelemetryData.properties);
    const t0 = performance.now();
    token.onCancellationRequested(() => {
      const t1 = performance.now();
      const duration = (t1 - t0) / 1000;
      chatTelemetryData.extendBy(
        { [PropertySystemRequestCancelled]: "true" },
        { [MeasurementCommandExcutionTimeSec]: duration }
      );
      chatTelemetryData.markComplete();
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CopilotChat, chatTelemetryData.properties);
    });
    const chatResult: ICopilotChatResult = {
      metadata: {
        command: command,
        requestId: chatTelemetryData.requestId,
      },
    };

    if (!candidates || candidates.length === 0) {
      chatResult.errorDetails = { message: "No skill is available to process the request." };
      return chatResult;
    }

    // dispatcher
    let spec = new Spec(request.prompt);
    const MAXIUMRUNTIME = 10;
    let executed = 0;
    try {
      for (const candidate of candidates) {
        while (executed < MAXIUMRUNTIME) {
          executed++;
          if (!candidate.canInvoke(request, spec)) {
            throw new Error("Internal error: the prior skill failed to produce necessary data.");
          }
          const specCopy = deepClone(spec);
          const invokeResult: ExecutionResultEnum = await candidate.invoke(
            languageModel,
            request,
            response,
            token,
            specCopy
          );
          if (invokeResult == ExecutionResultEnum.Failure) {
            // kind of retry
            // Any changes on the specCopy except telemetryData will be throw away by design
            spec.appendix.telemetryData = specCopy.appendix.telemetryData;
            continue;
          }

          // For the rejected case, spec.sections will be have reason to reject
          // For the success case, spec.sections will be have the result
          spec = deepClone(specCopy);
          if (invokeResult == ExecutionResultEnum.Rejected) {
            // hard stop if one of the skill reject to process the request
            // for example, the user ask is not what we target to address
            spec.appendix.telemetryData.properties[PropertySystemRequesRejected] = "true";
            spec.appendix.telemetryData.properties[PropertySystemFailureFromSkill] =
              candidate.name || "unknown";
            throw new Error(
              `The skill "${candidate.name || "Unknown"}" is rejected to process the request.`
            );
          }
          break;
        }

        if (executed >= MAXIUMRUNTIME - (candidates.length - 1)) {
          // The previous steps cost too much that no chance to run the rest
          // So this is a hard stop
          spec.appendix.telemetryData.properties[PropertySystemRequestFailed] = "true";
          spec.appendix.telemetryData.properties[PropertySystemFailureFromSkill] =
            candidate.name || "unknown";
          throw new Error("Failed to process the request.");
        }
        spec.appendix.telemetryData.properties[PropertySystemRequestSucceeded] = "true";
        console.log(`Skill ${candidate.name || "unknown"} is executed.`);
      }
    } catch (error) {
      let errorDetails = `
I can't assist you with this request. Here are some details:
      `;
      if (spec.sections.length > 0) {
        spec.sections.forEach((section) => {
          errorDetails = errorDetails.concat(`\n- ${section}`);
        });
      } else {
        errorDetails = errorDetails.concat(`\n- ${(error as Error).message}`);
      }
      response.markdown(errorDetails);
    }
    const t1 = performance.now();
    const duration = (t1 - t0) / 1000;
    spec.appendix.telemetryData.measurements[MeasurementCommandExcutionTimeSec] = duration;
    chatTelemetryData.extendBy(
      spec.appendix.telemetryData.properties,
      spec.appendix.telemetryData.measurements
    );
    chatTelemetryData.markComplete();
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CopilotChat, chatTelemetryData.properties);

    return chatResult;
  }
}
