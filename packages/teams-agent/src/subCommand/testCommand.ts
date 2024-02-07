import { AgentRequest } from '../chat/agent';
import { SlashCommand, SlashCommandHandlerResult } from '../chat/slashCommands';
import * as testcases from '../data/matchTest.json';
import { matchProject } from '../projectMatch';

const testCommandName = "test";

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
  for (const test of testcases) {
    request.userPrompt = test.prompt;
    request.progress.report({
      content: `test: ${test.prompt}    expected: ${test.expected}\n\n`
    });
    const result = await matchProject(request);
    let passed = false;
    for (const expectedApp of test.expected) {
      if (result.some((r) => r.id === expectedApp)) {
        passed = true;
        break;
      }
    }
    request.progress.report({
      content: `[${passed ? "PASSED" : "FAILED"}] response: ${JSON.stringify(result.map((r) => r.id))}\n\n`
    });
  }

  return { chatAgentResult: { slashCommand: '' }, followUp: [] };
}
