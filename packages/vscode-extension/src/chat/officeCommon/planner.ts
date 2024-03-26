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
import { ICopilotChatResult } from "../types";
import { ChatTelemetryData } from "../telemetry";
import { TelemetryEvent } from "../../telemetry/extTelemetryEvents";
import { ExtTelemetry } from "../../telemetry/extTelemetry";

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
        let processed: Spec | null = null;
        while (executed < MAXIUMRUNTIME) {
          executed++;
          if (!candidate.canInvoke(request, spec)) {
            throw new Error("Internal error: the prior skill failed to produce necessary data.");
          }
          processed = await candidate.invoke(languageModel, request, response, token, spec);
          if (!processed) {
            // kind of retry
            continue;
          }

          spec = processed;
          break;
        }

        if (executed >= MAXIUMRUNTIME - (candidates.length - 1)) {
          // The previous steps cost too much that no chance to run the rest
          // So this is a hard stop
          throw new Error("Failed to process the request.");
        }
        console.log(`Skill ${candidate.name || "unknown"} is executed.`);
      }
    } catch (error) {
      chatResult.errorDetails = {
        message: `Failed to process the request: ${(error as Error).message}`,
      };
    }

    return chatResult;
  }
}
