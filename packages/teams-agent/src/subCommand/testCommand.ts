import { AgentRequest } from '../chat/agent';
import { SlashCommand, SlashCommandHandlerResult } from '../chat/slashCommands';
import * as sampleTests from '../data/sampleMatchTest.json';
import * as templateTests from '../data/templateMatchTest.json';
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
  const statistics = {
    passed: 0,
    acceptable: 0,
    failed: 0,
  };
  for (const test of [...templateTests, ...sampleTests]) {
    request.userPrompt = test.prompt;
    request.response.report({
      content: `test: ${test.prompt}    expected: ${test.expected}\n\n`
    });
    const result = await matchProject(request);
    let matched = false;
    let isFirstResult = false;
    for (const expectedApp of test.expected) {
      if (result.some((r) => r.id === expectedApp)) {
        matched = true;
        isFirstResult = expectedApp === result[0].id;
        break;
      }
    }
    if (matched) {
      if (isFirstResult) {
        statistics.passed++;
      } else {
        statistics.acceptable++;
      }
    } else {
      statistics.failed++;
    }
    request.response.report({
      content: `[${matched ? (isFirstResult ? "Passed" : "Acceptable") : "Failed"}] response: ${JSON.stringify(result.map((r) => r.id))}\n\n`
    });
  }
  request.response.report({
    content: `${statistics.passed} passed. ${statistics.acceptable} acceptable. ${statistics.failed} failed.\n\n`
  });

  return { chatAgentResult: { slashCommand: '' }, followUp: [] };
}
