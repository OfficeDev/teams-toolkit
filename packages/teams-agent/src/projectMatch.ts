import { AgentRequest } from './chat/agent';
import { getResponseAsStringCopilotInteraction, parseCopilotResponseMaybeWithStrJson } from './chat/copilotInteractions';
import * as teamsTemplateConfig from './data/templateConfig.json';
import { fetchOnlineSampleConfig } from "./sample";

export type ProjectMetadata = {
  id: string;
  type: "template" | "sample";
  platform: "Teams" | "WXP";
  name: string;
  description: string;
  data?: unknown;
};

export async function matchProject(request: AgentRequest): Promise<ProjectMetadata[]> {
  const allProjectMetadata = [...getTeamsTemplateMetadata(), ...(await getTeamsSampleMetadata())];
  const prompt = getTestSystemPrompt(allProjectMetadata);
  const response = await getResponseAsStringCopilotInteraction(
    prompt,
    request
  );
  const matchedProjectId: string[] = [];
  if (response) {
    const responseJson = parseCopilotResponseMaybeWithStrJson(response);
    if (responseJson && responseJson.app) {
      matchedProjectId.push(...(responseJson.app as string[]));
    }
  }
  const result: ProjectMetadata[] = [];
  for (const id of matchedProjectId) {
    const matchedProject = allProjectMetadata.find((config) => config.id === id);
    if (matchedProject) {
      result.push(matchedProject);
    }
  }
  return result;
}

function getTestSystemPrompt(projectMetadata: ProjectMetadata[]): string {
  const appsDescription = projectMetadata.map((config) => `'${config.id}' (${config.description})`).join(", ");
  const examples = [{
    "user": "an app that manages to-do list and works in Outlook",
    "app": "todo-list-with-Azure-backend-M365"
  }, {
    "user": "an app to send notification to a lot of users",
    "app": "large-scale-notification"
  }, {
    "user": "an app shown in sharepoint",
    "app": "tab-spfx",
  }, {
    "user": "a tab app",
    "app": "tab-non-sso"
  }, {
    "user": "a bot that accepts commands",
    "app": "command-bot"
  }
  ];
  const exampleDescription = examples.map((example, index) => `${index + 1}. User asks: ${example.user}, return { "app": [${example.app}]}.`).join(" ");
  return `You are an expert in determining which of the following apps the user is interested. The apps are: ${appsDescription}. Your job is to determine which app would most help the user based on their query. Choose at most three of the available apps as the best matched app. Only repsond with a JSON object containing the app you choose. Do not respond in a coverstaional tone, only JSON. For example: ${exampleDescription}
  `;
}

async function getTeamsSampleMetadata(): Promise<ProjectMetadata[]> {
  const sampleConfig = await fetchOnlineSampleConfig();
  const result: ProjectMetadata[] = [];
  for (const sample of sampleConfig.samples) {
    result.push({
      id: sample.id,
      type: "sample",
      platform: "Teams",
      name: sample.title,
      description: sample.fullDescription,
    });
  }
  return result;
}

function getTeamsTemplateMetadata(): ProjectMetadata[] {
  return teamsTemplateConfig.map((config) => {
    return {
      id: config.id,
      type: "template",
      platform: "Teams",
      name: config.name,
      description: config.description,
      data: {
        capabilities: config.id,
        "project-type": config["project-type"]
      }
    };
  });
}
