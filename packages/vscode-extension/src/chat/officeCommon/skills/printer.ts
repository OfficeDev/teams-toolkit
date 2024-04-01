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

export class Printer implements ISkill {
  name: string | undefined;
  capability: string | undefined;

  constructor() {
    this.name = "printer";
    this.capability = "Print the output in a readable format to user";
  }

  public canInvoke(request: ChatRequest, spec: Spec): boolean {
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
    request: ChatRequest,
    response: ChatResponseStream,
    token: CancellationToken,
    spec: Spec
  ): Promise<{ result: ExecutionResultEnum; spec: Spec }> {
    const isSummaryHarmful = await isOutputHarmful(spec.userInput, token);
    const isTaskBreakdownHarmful = await isOutputHarmful(
      spec.appendix.codeTaskBreakdown.join("\n- "),
      token
    );
    const isCodeSnippetHarmful = await isOutputHarmful(spec.appendix.codeSnippet, token);
    const isCodeExplanationHarmful = await isOutputHarmful(spec.appendix.codeExplanation, token);
    if (
      isSummaryHarmful ||
      isTaskBreakdownHarmful ||
      isCodeSnippetHarmful ||
      isCodeExplanationHarmful
    ) {
      response.markdown("The response is filtered by Responsible AI service.");
      return { result: ExecutionResultEnum.Failure, spec: spec };
    }
    const template = `
# 1. Task Summary
${spec.userInput}

# 2. Task Breakdown
You're looking for a code snippet for Office ${
      spec.appendix.host
    }, we break down the task into smaller, manageable steps. This helps to clarify the task and make it easier to tackle. Here's how we break down a task:
- ${spec.appendix.codeTaskBreakdown.join("\n- ")}

# 3. The output
The following TypeScript code snippet is generated based on the task breakdown. You can copy and paste it into your project, and modify it as needed.
## 3.1 TypeScript Code Snippets
\`\`\`typescript
${spec.appendix.codeSnippet}
\`\`\`
## 3.2 Code Explanation
${spec.appendix.codeExplanation}
`;
    response.markdown(template);
    return { result: ExecutionResultEnum.Success, spec: spec };
  }
}
