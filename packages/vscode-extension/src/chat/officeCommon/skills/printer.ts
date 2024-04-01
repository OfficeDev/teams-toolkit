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
    const template = `
# 1. Task Summary
${spec.userInput}

# 2. The output
The following TypeScript code snippet is generated based on the task breakdown. You can copy and paste it into your project, and modify it as needed.
## 2.1 TypeScript Code Snippets
\`\`\`typescript
${spec.appendix.codeSnippet}
\`\`\`
## 2.2 Code Explanation
${spec.appendix.codeExplanation}
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
