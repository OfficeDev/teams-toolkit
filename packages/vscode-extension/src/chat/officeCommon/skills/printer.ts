// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CancellationToken,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatUserMessage,
} from "vscode";
import { ISkill } from "./iSkill";
import { Spec } from "./spec";
import { ExecutionResultEnum } from "./executionResultEnum";
import { isOutputHarmful } from "../../utils";
import { index } from "../../../../test/mocks/vsc/arrays";

export class Printer implements ISkill {
  name: string | undefined;
  capability: string | undefined;

  constructor() {
    this.name = "printer";
    this.capability = "Print the output in a readable format to user";
  }

  public canInvoke(spec: Spec): boolean {
    return (
      !!spec.userInput &&
      !!spec.appendix.codeSnippet &&
      !!spec.appendix.codeTaskBreakdown &&
      spec.appendix.codeTaskBreakdown.length > 0
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async invoke(
    languageModel: LanguageModelChatUserMessage,
    response: ChatResponseStream,
    token: CancellationToken,
    spec: Spec
  ): Promise<{ result: ExecutionResultEnum; spec: Spec }> {
    const template = `
For your question:\n
${spec.userInput}

Here is a code snippet using Office JavaScript API and TypeScript to help you get started:
\`\`\`typescript
${spec.appendix.codeSnippet}
\`\`\`

The code above powered by AI, so surprises and mistakes are possible. Make sure to verify any generated code or suggestions.
`;
    const isHarmful = await isOutputHarmful(template, token);
    if (isHarmful) {
      response.markdown("The response is filtered by Responsible AI service.");
      return { result: ExecutionResultEnum.Failure, spec: spec };
    } else {
      response.markdown(template);
      return { result: ExecutionResultEnum.Success, spec: spec };
    }
  }
}
