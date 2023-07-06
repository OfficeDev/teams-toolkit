// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, err } from "@microsoft/teamsfx-api";
import { createNewEnvQuestionNode } from "../../question/other";
import { traverse } from "../../ui/visitor";
import { TOOLS } from "../globalVars";
import { CoreHookContext } from "../types";

const lastUsedMark = " (last used)";

type CreateEnvCopyInput = {
  targetEnvName: string;
  sourceEnvName: string;
};

export async function askNewEnvironment(
  ctx: CoreHookContext,
  inputs: Inputs
): Promise<CreateEnvCopyInput | undefined> {
  const node = createNewEnvQuestionNode();
  if (node) {
    const res = await traverse(node, inputs, TOOLS.ui);
    if (res.isErr()) {
      TOOLS.logProvider.debug(`[core:env] failed to run question model for target environment.`);
      ctx.result = err(res.error);
      return undefined;
    }
  }
  const sourceEnvName = inputs.sourceEnvName!;
  let selectedEnvName: string;
  if (sourceEnvName?.endsWith(lastUsedMark)) {
    selectedEnvName = sourceEnvName.slice(0, sourceEnvName.indexOf(lastUsedMark));
  } else {
    selectedEnvName = sourceEnvName;
  }

  return {
    targetEnvName: inputs.newTargetEnvName,
    sourceEnvName: selectedEnvName,
  };
}
