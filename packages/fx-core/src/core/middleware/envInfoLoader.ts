// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FxError,
  Inputs,
  ok,
  ProjectSettings,
  QTreeNode,
  Result,
  SolutionConfig,
  SolutionContext,
  Tools,
  traverse,
} from "@microsoft/teamsfx-api";
import { CoreHookContext, FxCore } from "../..";
import {
  NoProjectOpenedError,
  ProjectEnvNotExistError,
  ProjectSettingsUndefinedError,
} from "../error";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { LocalCrypto } from "../crypto";
import { environmentManager } from "../environment";
import { GLOBAL_CONFIG, PROGRAMMING_LANGUAGE } from "../../plugins/solution/fx-solution/constants";
import { QuestionSelectTargetEnvironment, QuestionNewTargetEnvironmentName } from "../question";
import { desensitize } from "./questionModel";
import { shouldIgnored } from "./projectSettingsLoader";

const newTargetEnvNameOption = "+ new environment";
const lastUsedMark = " (current)";
let lastUsedEnvName: string | undefined;

export function EnvInfoLoaderMW(
  isMultiEnvEnabled: boolean,
  allowCreateNewEnv: boolean
): Middleware {
  return async (ctx: CoreHookContext, next: NextFunction) => {
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    if (shouldIgnored(ctx)) {
      await next();
      return;
    }
    if (inputs.previewType && inputs.previewType === "local") {
      isMultiEnvEnabled = false;
    }

    if (!ctx.projectSettings) {
      ctx.result = err(ProjectSettingsUndefinedError());
      return;
    }

    const core = ctx.self as FxCore;
    let targetEnvName: string | undefined;
    if (isMultiEnvEnabled) {
      if (inputs.env) {
        const checkEnv = await environmentManager.checkEnvExist(inputs.projectPath!, inputs.env);
        if (checkEnv.isErr()) {
          ctx.result = checkEnv.error;
          return;
        }
        if (checkEnv.value || allowCreateNewEnv) {
          targetEnvName = inputs.env;
        } else {
          ctx.result = err(ProjectEnvNotExistError(inputs.env));
          return;
        }
      } else {
        targetEnvName = await askTargetEnvironment(ctx, inputs, allowCreateNewEnv, lastUsedEnvName);
        lastUsedEnvName = targetEnvName ?? lastUsedEnvName;
      }
    } else {
      targetEnvName = environmentManager.defaultEnvName;
    }

    if (targetEnvName) {
      const result = await loadSolutionContext(
        core.tools,
        inputs,
        ctx.projectSettings,
        ctx.projectIdMissing,
        targetEnvName
      );
      if (result.isErr()) {
        ctx.result = err(result.error);
        return;
      }

      ctx.solutionContext = result.value;

      await next();
    }
  };
}

export async function loadSolutionContext(
  tools: Tools,
  inputs: Inputs,
  projectSettings: ProjectSettings,
  projectIdMissing?: boolean,
  targetEnvName?: string
): Promise<Result<SolutionContext, FxError>> {
  if (!inputs.projectPath) {
    return err(NoProjectOpenedError());
  }

  const cryptoProvider = new LocalCrypto(projectSettings.projectId);
  // ensure backwards compatibility:
  // no need to decrypt the secrets in *.userdata for previous TeamsFx project, which has no project id.
  const envDataResult = await environmentManager.loadEnvProfile(
    inputs.projectPath,
    targetEnvName,
    projectIdMissing ? undefined : cryptoProvider
  );

  if (envDataResult.isErr()) {
    return err(envDataResult.error);
  }
  const envInfo = envDataResult.value;

  // upgrade programmingLanguange if exists.
  const solutionConfig = envInfo.data as SolutionConfig;
  const programmingLanguage = solutionConfig.get(GLOBAL_CONFIG)?.get(PROGRAMMING_LANGUAGE);
  if (programmingLanguage) {
    // add programmingLanguage in project settings
    projectSettings.programmingLanguage = programmingLanguage;

    // remove programmingLanguage in solution config
    solutionConfig.get(GLOBAL_CONFIG)?.delete(PROGRAMMING_LANGUAGE);
  }

  const solutionContext: SolutionContext = {
    projectSettings: projectSettings,
    targetEnvName: envInfo.envName,
    config: envInfo.data,
    root: inputs.projectPath || "",
    ...tools,
    ...tools.tokenProvider,
    answers: inputs,
    cryptoProvider: cryptoProvider,
  };

  return ok(solutionContext);
}

async function askTargetEnvironment(
  ctx: CoreHookContext,
  inputs: Inputs,
  allowCreateNewEnv: boolean,
  lastUsed?: string
): Promise<string | undefined> {
  const getQuestionRes = await getQuestionsForTargetEnv(inputs, allowCreateNewEnv, lastUsed);
  const core = ctx.self as FxCore;
  if (getQuestionRes.isErr()) {
    core.tools.logProvider.error(
      `[core:env] failed to get questions for target environment: ${getQuestionRes.error.message}`
    );
    ctx.result = err(getQuestionRes.error);
    return undefined;
  }

  core.tools.logProvider.debug(`[core:env] success to get questions for target environment.`);

  const node = getQuestionRes.value;
  if (node) {
    const res = await traverse(node, inputs, core.tools.ui);
    if (res.isErr()) {
      core.tools.logProvider.debug(
        `[core:env] failed to run question model for target environment.`
      );
      ctx.result = err(res.error);
      return undefined;
    }

    const desensitized = desensitize(node, inputs);
    core.tools.logProvider.info(
      `[core:env] success to run question model for target environment, answers:${JSON.stringify(
        desensitized
      )}`
    );
  }

  const targetEnvName = inputs.targetEnvName;
  if (targetEnvName === newTargetEnvNameOption) {
    return inputs.newTargetEnvName;
  } else if (targetEnvName?.endsWith(lastUsedMark)) {
    return targetEnvName.slice(0, targetEnvName.indexOf(lastUsedMark));
  } else {
    return targetEnvName;
  }
}

async function getQuestionsForTargetEnv(
  inputs: Inputs,
  allowCreateNewEnv: boolean,
  lastUsed?: string
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (!inputs.projectPath) {
    return err(NoProjectOpenedError());
  }

  const envProfilesResult = await environmentManager.listEnvProfiles(inputs.projectPath);
  if (envProfilesResult.isErr()) {
    return err(envProfilesResult.error);
  }

  const envList = reOrderEnvironments(envProfilesResult.value, lastUsed);
  const selectEnv = QuestionSelectTargetEnvironment;
  if (allowCreateNewEnv) {
    selectEnv.staticOptions = [newTargetEnvNameOption].concat(envList);
  } else {
    selectEnv.staticOptions = envList;
  }

  const node = new QTreeNode(selectEnv);

  const childNode = new QTreeNode(QuestionNewTargetEnvironmentName);
  childNode.condition = { equals: newTargetEnvNameOption };

  node.addChild(childNode);

  return ok(node.trim());
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
