import * as vscode from "vscode";
import { AgentRequest } from "../../chat/agent";
import { getResponseAsStringCopilotInteraction } from "../../chat/copilotInteractions";
import {
  SlashCommand,
  SlashCommandHandlerResult,
} from "../../chat/slashCommands";
import { getTeamsApps } from "../../util";
import { getWholeStatus, setProjectStatus } from "./status";
import { AllSteps } from "./steps";
import { NextStep, WholeStatus } from "./types";

const nextStepCommandName = "nextstep";
let teamsApp: string | undefined = undefined;
let projectId: string | undefined = undefined;

export function getNextStepCommand(): SlashCommand {
  return [
    nextStepCommandName,
    {
      shortDescription: `Use this command to move to the next step anytime.`,
      longDescription: `Type this command without additional descriptions to progress to the next step at any stage of Teams apps development.`,
      intentDescription: "",
      handler: (request: AgentRequest) => nextStepHandler(request),
    },
  ];
}

async function nextStepHandler(
  request: AgentRequest
): Promise<SlashCommandHandlerResult> {
  // get all Teams apps under workspace
  const teamsApps = getTeamsApps(vscode.workspace.workspaceFolders);
  teamsApp = (teamsApps ?? [])[0];
  const status: WholeStatus = await getWholeStatus(teamsApp);
  projectId = status.projectOpened?.projectId;
  const steps = AllSteps.filter((s) => s.condition(status)).sort(
    (a, b) => a.priority - b.priority
  );
  if (steps.length > 1) {
    request.response.markdown(
      vscode.l10n.t("Here are the next steps you can do:\n")
    );
  }
  for (let index = 0; index < Math.min(3, steps.length); index++) {
    const s = steps[index];
    if (s.description instanceof Function) {
      s.description = s.description(status);
    }
    const response = await describeStep(s, request);
    const title = s.docLink ? `[${s.title}](${s.docLink})` : s.title;
    if (steps.length > 1) {
      request.response.markdown(`${index + 1}. ${title}: ${response}\n`);
    } else {
      request.response.markdown(`${title}: ${response}\n`);
    }
    s.commands.forEach((c) => {
      request.response.button(c);
    });
  }
  const followUps: vscode.ChatFollowup[] = [];
  steps.forEach((s) => {
    followUps.push(...s.followUps);
  });
  return {
    chatAgentResult: { metadata: { slashCommand: "nextstep" } },
    followUp: followUps,
  };
}

async function describeStep(
  step: NextStep,
  request: AgentRequest
): Promise<string> {
  const originPrompt = request.userPrompt;
  request.userPrompt = `The scenario you are looking for is '${JSON.stringify({
    description: step.description as string,
  })}'.`;
  const response = await getResponseAsStringCopilotInteraction(
    `You are an advisor for Teams App developers. You need to describe the scenario based on description field of user's JSON content. You should control the output between 15 and 40 words and within one paragraph.`,
    request
  );
  request.userPrompt = originPrompt;
  return response;
}

export const DefaultNextStep: vscode.ChatFollowup = {
  prompt: "",
  command: "nextstep",
  label: vscode.l10n.t("What's next I could do?"),
};

export const EXECUTE_COMMAND_ID = "teamsAgent.executeCommand";
export async function executeCommand(command: string, ...args: any[]) {
  const p = projectId ?? teamsApp;
  const needRecord = !!p && command.startsWith("fx-extension.");
  let c = command.replace("fx-extension.", "").trim();
  if (c.toLocaleLowerCase().includes("debug")) {
    c = "debug";
  }
  try {
    await vscode.commands.executeCommand(command, ...args);
    // TODO: redefine this part when merging to TTK
    if (needRecord) {
      await setProjectStatus(p!, c, {
        result: "success",
        time: new Date(),
      });
    }
  } catch (e) {
    if (needRecord) {
      await setProjectStatus(p!, c, {
        result: "fail",
        time: new Date(),
      });
    }
    return e;
  }
  return undefined;
}

export const OPENURL_COMMAND_ID = "teamsAgent.openUrlCommand";
export async function openUrlCommand(url: string) {
  await vscode.env.openExternal(vscode.Uri.parse(url));
}
