// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, QTreeNode, Result, err, ok } from "@microsoft/teamsfx-api";
import { environmentManager } from "../environment";
import { NoProjectOpenedError } from "../error";
import { TOOLS } from "../globalVars";
import { QuestionSelectSourceEnvironment, getQuestionNewTargetEnvironmentName } from "../question";
import { CoreHookContext } from "../types";
import { traverse } from "../../ui/visitor";

const lastUsedMark = " (last used)";
let lastUsedEnv: string | undefined;

type CreateEnvCopyInput = {
  targetEnvName: string;
  sourceEnvName: string;
};

export async function askNewEnvironment(
  ctx: CoreHookContext,
  inputs: Inputs
): Promise<CreateEnvCopyInput | undefined> {
  const getQuestionRes = await getQuestionsForNewEnv(inputs, lastUsedEnv);
  if (getQuestionRes.isErr()) {
    TOOLS.logProvider.error(
      `[core:env] failed to get questions for target environment: ${getQuestionRes.error.message}`
    );
    ctx.result = err(getQuestionRes.error);
    return undefined;
  }

  TOOLS.logProvider.debug(`[core:env] success to get questions for target environment.`);

  const node = getQuestionRes.value;
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

async function getQuestionsForNewEnv(
  inputs: Inputs,
  lastUsed?: string
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (!inputs.projectPath) {
    return err(new NoProjectOpenedError());
  }
  const group = new QTreeNode({ type: "group" });

  const newEnvNameNode = new QTreeNode(getQuestionNewTargetEnvironmentName(inputs.projectPath));
  group.addChild(newEnvNameNode);

  const envProfilesResult = await environmentManager.listRemoteEnvConfigs(inputs.projectPath, true);
  if (envProfilesResult.isErr()) {
    return err(envProfilesResult.error);
  }

  const envList = reOrderEnvironments(envProfilesResult.value, lastUsed);
  const selectSourceEnv = QuestionSelectSourceEnvironment();
  selectSourceEnv.staticOptions = envList;
  selectSourceEnv.default = lastUsed + lastUsedMark;

  const selectSourceEnvNode = new QTreeNode(selectSourceEnv);
  group.addChild(selectSourceEnvNode);

  return ok(group.trim());
}

function reOrderEnvironments(environments: Array<string>, lastUsed?: string): Array<string> {
  if (!lastUsed) {
    return environments;
  }

  const index = environments.indexOf(lastUsed);
  if (index === -1) {
    return environments;
  }

  return [lastUsed + lastUsedMark]
    .concat(environments.slice(0, index))
    .concat(environments.slice(index + 1));
}
