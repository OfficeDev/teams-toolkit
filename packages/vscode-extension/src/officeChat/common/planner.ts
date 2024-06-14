// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CancellationToken,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatMessage,
} from "vscode";
import { OfficeChatCommand } from "../consts";
import { ISkill } from "./skills/iSkill";
import { SkillsManager } from "./skills/skillsManager";
import { Spec } from "./skills/spec";
import { ICopilotChatOfficeResult } from "../types";
import { ChatTelemetryData } from "../../chat/telemetry";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import { ExtTelemetry } from "../../telemetry/extTelemetry";
import { ExecutionResultEnum } from "./skills/executionResultEnum";
import {
  MeasurementCommandExcutionTimeSec,
  PropertySystemFailureFromSkill,
  PropertySystemRequesRejected,
  PropertySystemRequestCancelled,
  PropertySystemRequestFailed,
  PropertySystemRequestFailedAndGoNext,
  PropertySystemRequestSucceeded,
} from "./telemetryConsts";
import { purifyUserMessage } from "../utils";
import { localize } from "../../utils/localizeUtils";

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
    languageModel: LanguageModelChatMessage,
    request: ChatRequest,
    response: ChatResponseStream,
    token: CancellationToken,
    command: OfficeChatCommand,
    telemetryData: ChatTelemetryData
  ): Promise<ICopilotChatOfficeResult> {
    const candidates: ISkill[] = SkillsManager.getInstance().getCapableSkills(command);
    const t0 = performance.now();
    token.onCancellationRequested(() => {
      const t1 = performance.now();
      const duration = (t1 - t0) / 1000;
      telemetryData.extendBy(
        { [PropertySystemRequestCancelled]: "true" },
        { [MeasurementCommandExcutionTimeSec]: duration }
      );
      telemetryData.markComplete();
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CopilotChat, telemetryData.properties);
    });
    const chatResult: ICopilotChatOfficeResult = {
      metadata: {
        command: command,
        requestId: telemetryData.requestId,
      },
    };

    if (!candidates || candidates.length === 0) {
      chatResult.errorDetails = { message: "No skill is available to process the request." };
      return chatResult;
    }

    // dispatcher
    const purified = await purifyUserMessage(request.prompt, token, telemetryData);
    const spec = new Spec(purified);
    spec.appendix.telemetryData.requestId = telemetryData.requestId;
    try {
      for (let index = 0; index < candidates.length; index++) {
        const candidate = candidates[index];
        if (!candidate.canInvoke(spec)) {
          throw new Error("Internal error: the prior skill failed to produce necessary data.");
        }
        const { result: invokeResult, spec: newSpec }: { result: ExecutionResultEnum; spec: Spec } =
          await candidate.invoke(languageModel, response, token, spec);
        spec.clone(newSpec);
        if (invokeResult == ExecutionResultEnum.Failure) {
          spec.appendix.telemetryData.properties[PropertySystemRequestFailed] = "true";
          spec.appendix.telemetryData.properties[PropertySystemFailureFromSkill] =
            candidate.name || "unknown";
          if (spec.appendix.telemetryData.isHarmful) {
            telemetryData.properties[TelemetryProperty.CopilotChatBlockReason] = "RAI";
          }
          throw new Error("Failed to process the request.");
        }

        if (invokeResult == ExecutionResultEnum.Rejected) {
          // hard stop if one of the skill reject to process the request
          // for example, the user ask is not what we target to address
          spec.appendix.telemetryData.properties[PropertySystemRequesRejected] = "true";
          spec.appendix.telemetryData.properties[PropertySystemFailureFromSkill] =
            candidate.name || "unknown";
          telemetryData.properties[TelemetryProperty.CopilotChatBlockReason] = "Off Topic";
          throw new Error(
            `The skill "${candidate.name || "Unknown"}" is rejected to process the request.`
          );
        }

        if (invokeResult == ExecutionResultEnum.FailedAndGoNext) {
          spec.appendix.telemetryData.properties[PropertySystemRequestFailedAndGoNext] = "true";
          spec.appendix.telemetryData.properties[PropertySystemFailureFromSkill] =
            candidate.name || "unknown";
        } else {
          spec.appendix.telemetryData.properties[PropertySystemRequestSucceeded] = "true";
        }

        console.log(`Skill ${candidate.name || "unknown"} is executed.`);
      }
    } catch (error) {
      console.error(error);
      const errorDetails = localize(
        "teamstoolkit.chatParticipants.officeAddIn.default.canNotAssist"
      );
      response.markdown(errorDetails);
    }
    const t1 = performance.now();
    const duration = (t1 - t0) / 1000;
    spec.appendix.telemetryData.measurements[MeasurementCommandExcutionTimeSec] = duration;
    telemetryData.extendBy(
      spec.appendix.telemetryData.properties,
      spec.appendix.telemetryData.measurements
    );
    telemetryData.properties[TelemetryProperty.HostType] = spec.appendix.host.toLowerCase();
    telemetryData.properties[TelemetryProperty.CopilotChatRelatedSampleName] =
      spec.appendix.telemetryData.relatedSampleName.toString();
    telemetryData.properties[TelemetryProperty.CopilotChatCodeClassAndMembers] =
      spec.appendix.telemetryData.codeClassAndMembers.toString();
    telemetryData.measurements[TelemetryProperty.CopilotChatTimeToFirstToken] =
      spec.appendix.telemetryData.timeToFirstToken - telemetryData.startTime;
    telemetryData.measurements[TelemetryProperty.CopilotChatTotalTokens] +=
      spec.appendix.telemetryData.totalTokens;
    for (const responseTokensPerSecond of spec.appendix.telemetryData.responseTokensPerSecond) {
      telemetryData.properties[TelemetryProperty.CopilotChatResponseTokensPerSecond] +=
        responseTokensPerSecond.toString() + ",";
    }
    console.log("User ask processing time cost: ", duration, " seconds.");

    return chatResult;
  }
}
