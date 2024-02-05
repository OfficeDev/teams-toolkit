import { AgentRequest } from '../chat/agent';
import { getResponseAsStringCopilotInteraction, parseCopilotResponseMaybeWithStrJson } from '../chat/copilotInteractions';
import { SlashCommand, SlashCommandHandlerResult } from '../chat/slashCommands';
import { fetchOnlineSampleConfig } from '../sample';
import * as templateConfig from '../templateConfig.json';

const testCommandName = "test";
const tests = [
  {
    prompt: "an app that manages to-do list and works in Outlook",
    expected: ["todo-list-with-Azure-backend-M365"],
  },
  {
    prompt: "an app to send notification to a lot of users",
    expected: ["large-scale-notification"],
  },
  {
    prompt: "an app shown in sharepoint",
    expected: ["tab-spfx"],
  },
  {
    prompt: "a tab app",
    expected: ["tab-non-sso"],
  },
  {
    prompt: "a bot app",
    expected: ["bot"],
  },
  {
    prompt: "a bot app that uses AI",
    expected: ["ai-bot"],
  },
  {
    prompt: "an app to show dashboard in SharePoint",
    expected: ["spfx-productivity-dashboard"],
  },
  {
    prompt: "an app to show dashboard in SharePoint",
    expected: ["spfx-productivity-dashboard"],
  },
  {
    prompt: "an app used in Teams meeting",
    expected: ["hello-world-in-meeting", "live-share-dice-roller", "meetings-live-code-interview"],
  },
  {
    prompt: "an app that sends weather forcast to me everyday",
    expected: ["stocks-update-notification-bot", "notification"],
  },
];

export function getTestCommand(): SlashCommand {
  return [testCommandName,
    {
      shortDescription: `sample/template matching test`,
      longDescription: `sample/template matching test`,
      intentDescription: '',
      handler: (request: AgentRequest) => testHandler(request)
    }];
}

async function testHandler(request: AgentRequest): Promise<SlashCommandHandlerResult> {
  const sampleConfig = await fetchOnlineSampleConfig();
  const unifiedConfig = [...templateConfig, ...transformSampleConfig(sampleConfig)];

  for (const test of tests) {
    request.userPrompt = test.prompt;
    request.progress.report({
      content: `test: ${test.prompt}\texpected: ${test.expected}\n\n`
    });
    const response = await getResponseAsStringCopilotInteraction(
      getTestSystemPrompt(unifiedConfig),
      request
    );
    let passed = false;
    if (response) {
      const responseJson = parseCopilotResponseMaybeWithStrJson(response);
      if (responseJson && responseJson.app) {
        const apps = responseJson.app as string[];
        for (const expectedApp of test.expected) {
          if (apps.includes(expectedApp)) {
            passed = true;
            request.progress.report({
              content: `[PASSED] response: ${response || ""}\n\n`
            });
            break;
          }
        }
      }
    }

    if (!passed) {
      request.progress.report({
        content: `[FAILED] response: ${response || ""}\n\n`
      });
    }
  }

  return { chatAgentResult: { slashCommand: '' }, followUp: [] };
}

function getTestSystemPrompt(unifiedConfig): string {
  const appsDescription = unifiedConfig.map((config) => `'${config.id}' (${config.description})`).join(", ");
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
  },
    // {
    //   "user": "a bot app with AI capabilities",
    //   "app": "teams-chef-bot"
    // }
  ];
  const exampleDescription = examples.map((example, index) => `${index + 1}. User asks: ${example.user}, return { "app": [${example.app}]}.`).join(" ");
  return `You are an expert in determining which of the following apps the user is interested. The apps are: ${appsDescription}. Your job is to determine which app would most help the user based on their query. Choose at most three of the available apps as the best matched app. Only repsond with a JSON object containing the app you choose. Do not respond in a coverstaional tone, only JSON. For example: ${exampleDescription}
  `;
}

function transformSampleConfig(sampleConfig: any): any {
  const result: any[] = [];
  for (const sample of sampleConfig.samples) {
    result.push({
      id: sample.id,
      type: "sample",
      name: sample.title,
      description: sample.fullDescription,
    });
  }
  return result;
}
