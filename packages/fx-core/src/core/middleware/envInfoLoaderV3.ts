// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import _ from "lodash";
import {
  err,
  FxError,
  Inputs,
  Json,
  ok,
  ProjectSettings,
  QTreeNode,
  Result,
  Stage,
  Tools,
  traverse,
  UserCancelError,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { isV3Enabled } from "../../common/tools";
import { ComponentNames } from "../../component/constants";
import { envLoaderMWImpl } from "../../component/middleware/envMW";
import { LocalCrypto } from "../crypto";
import { environmentManager, newEnvInfoV3 } from "../environment";
import { NoProjectOpenedError, ProjectSettingsUndefinedError } from "../error";
import { globalVars, TOOLS } from "../globalVars";
import {
  getQuestionNewTargetEnvironmentName,
  QuestionSelectSourceEnvironment,
  QuestionSelectTargetEnvironment,
} from "../question";
import { CoreHookContext } from "../types";
import { shouldIgnored } from "./projectSettingsLoader";
import { FileNotFoundError } from "../../error/common";

const newTargetEnvNameOption = "+ new environment";
const lastUsedMark = " (last used)";
export let lastUsedEnv: string | undefined;

export type CreateEnvCopyInput = {
  targetEnvName: string;
  sourceEnvName: string;
};

export function EnvInfoLoaderMW_V3(skip: boolean, ignoreLocalEnv = false): Middleware {
  return async (ctx: CoreHookContext, next: NextFunction) => {
    if (shouldIgnored(ctx)) {
      await next();
      return;
    }
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    if (isV3Enabled()) {
      const envBefore = _.cloneDeep(process.env);
      try {
        await envLoaderMWImpl(inputs.ignoreLocalEnv || ignoreLocalEnv ? false : true, ctx, next);
        return;
      } finally {
        const keys = Object.keys(process.env);
        for (const k of keys) {
          if (!(k in envBefore)) {
            delete process.env[k];
          } else {
            process.env[k] = envBefore[k];
          }
        }
      }
    }

    if (!ctx.projectSettings) {
      ctx.result = err(ProjectSettingsUndefinedError());
      return;
    }

    if (!inputs.projectPath) {
      ctx.result = err(new NoProjectOpenedError());
      return;
    }

    // make sure inputs.env always has value so telemetry can use it.
    if (inputs.stage === Stage.debug) inputs.ignoreEnvInfo = false; // for local debug v3, envInfo should not be ignored
    const envRes = await getTargetEnvName(skip, inputs, ctx);
    if (envRes.isErr()) {
      ctx.result = err(envRes.error);
      return;
    }
    inputs.env = envRes.value;

    const result = await loadEnvInfoV3(
      inputs as v2.InputsWithProjectPath,
      ctx.projectSettings,
      inputs.env,
      skip || inputs.ignoreEnvInfo
    );
    if (result.isErr()) {
      ctx.result = err(result.error);
      return;
    }

    ctx.envInfoV3 = result.value;

    upgradeProgrammingLanguage(ctx.envInfoV3.state, ctx.projectSettings);
    upgradeDefaultFunctionName(ctx.envInfoV3.state, ctx.projectSettings);

    // set globalVars for teamsAppId and m365TenantId
    const appManifestKey = ComponentNames.AppManifest;
    globalVars.teamsAppId = ctx.envInfoV3.state?.[appManifestKey]?.teamsAppId;
    globalVars.m365TenantId = ctx.envInfoV3.state?.[appManifestKey]?.m365TenantId;
    await next();
  };
}
export function upgradeProgrammingLanguage(solutionConfig: Json, projectSettings: ProjectSettings) {
  const programmingLanguage = solutionConfig.solution?.programmingLanguage;
  if (programmingLanguage) {
    // add programmingLanguage in project settings
    projectSettings.programmingLanguage = programmingLanguage;

    // remove programmingLanguage in solution config
    solutionConfig.solution.programmingLanguage = undefined;
  }
}

export function upgradeDefaultFunctionName(solutionConfig: Json, projectSettings: ProjectSettings) {
  // upgrade defaultFunctionName if exists.
  const defaultFunctionName = solutionConfig.solution?.defaultFunctionName;
  if (defaultFunctionName) {
    // add defaultFunctionName in project settings
    projectSettings.defaultFunctionName = defaultFunctionName;
    // remove defaultFunctionName in function plugin's config
    solutionConfig.solution.defaultFunctionName = undefined;
  }
}
export async function loadEnvInfoV3(
  inputs: v2.InputsWithProjectPath,
  projectSettings: ProjectSettings,
  targetEnvName?: string,
  ignoreEnvInfo = false
): Promise<Result<v3.EnvInfoV3, FxError>> {
  const cryptoProvider = new LocalCrypto(projectSettings.projectId);

  let envInfo: v3.EnvInfoV3;
  // in pre-multi-env case, envInfo is always loaded.
  if (ignoreEnvInfo) {
    envInfo = newEnvInfoV3();
    envInfo.envName = "";
  } else {
    // ensure backwards compatibility:
    // project id will be generated for previous TeamsFx project.
    // Decrypting the secrets in *.userdata with generated project id works because secrets doesn't have prefix.
    const envDataResult = await environmentManager.loadEnvInfo(
      inputs.projectPath,
      cryptoProvider,
      targetEnvName,
      true
    );

    if (envDataResult.isErr()) {
      return err(envDataResult.error);
    }
    envInfo = envDataResult.value as v3.EnvInfoV3;
  }
  return ok(envInfo);
}

export async function getTargetEnvName(
  skip: boolean,
  inputs: Inputs,
  ctx: CoreHookContext
): Promise<Result<string, FxError>> {
  let targetEnvName: string;
  if (!skip && !inputs.ignoreEnvInfo) {
    // TODO: This is a workaround for collabrator & manifest preview feature to programmatically load an env in extension.
    if (inputs.env) {
      const result = await useUserSetEnv(inputs.projectPath!, inputs.env);
      if (result.isErr()) {
        ctx.result = result;
        return err(result.error);
      }
      targetEnvName = result.value;
    } else {
      const result = await askTargetEnvironment(TOOLS, inputs);
      if (result.isErr()) {
        ctx.result = err(result.error);
        return err(result.error);
      }
      targetEnvName = result.value;
      TOOLS.logProvider.info(
        `[${targetEnvName}] is selected as the target environment to ${ctx.method}`
      );

      lastUsedEnv = targetEnvName;
    }
  } else {
    targetEnvName = environmentManager.getDefaultEnvName();
  }
  return ok(targetEnvName);
}

export async function askTargetEnvironment(
  tools: Tools,
  inputs: Inputs
): Promise<Result<string, FxError>> {
  const getQuestionRes = await getQuestionsForTargetEnv(inputs, lastUsedEnv);
  if (getQuestionRes.isErr()) {
    tools.logProvider.error(
      `[core:env] failed to get questions for target environment: ${getQuestionRes.error.message}`
    );
    return err(getQuestionRes.error);
  }

  tools.logProvider.debug(`[core:env] success to get questions for target environment.`);

  const node = getQuestionRes.value;
  if (node) {
    const res = await traverse(node, inputs, tools.ui);
    if (res.isErr()) {
      tools.logProvider.debug(`[core:env] failed to run question model for target environment.`);
      return err(res.error);
    }
  }

  if (!inputs.targetEnvName) {
    return err(UserCancelError);
  }

  let targetEnvName = inputs.targetEnvName;
  if (targetEnvName.endsWith(lastUsedMark)) {
    targetEnvName = targetEnvName.slice(0, targetEnvName.indexOf(lastUsedMark));
  }

  return ok(targetEnvName);
}

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

export async function useUserSetEnv(
  projectPath: string,
  env: string
): Promise<Result<string, FxError>> {
  let checkEnv = await environmentManager.checkEnvExist(projectPath, env);
  if (checkEnv.isErr()) {
    return err(checkEnv.error);
  }

  let envExists = checkEnv.value;
  if (!envExists) {
    if (env === environmentManager.getLocalEnvName()) {
      await environmentManager.createLocalEnv(projectPath);
      checkEnv = await environmentManager.checkEnvExist(projectPath, env);
      if (checkEnv.isErr()) {
        return err(checkEnv.error);
      }
      envExists = checkEnv.value;
    }
    if (!envExists) {
      return err(new FileNotFoundError("EnvInfoLoaderMW_V3", `config.${env}.json`));
    }
  }

  return ok(env);
}

export async function getQuestionsForTargetEnv(
  inputs: Inputs,
  lastUsed?: string
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (!inputs.projectPath) {
    return err(new NoProjectOpenedError());
  }

  const envProfilesResult = await environmentManager.listRemoteEnvConfigs(inputs.projectPath, true);
  if (envProfilesResult.isErr()) {
    return err(envProfilesResult.error);
  }

  const envList = reOrderEnvironments(envProfilesResult.value, lastUsed);
  const selectEnv = QuestionSelectTargetEnvironment();
  selectEnv.staticOptions = envList;

  const node = new QTreeNode(selectEnv);

  const childNode = new QTreeNode(getQuestionNewTargetEnvironmentName(inputs.projectPath));
  childNode.condition = { equals: newTargetEnvNameOption };

  node.addChild(childNode);

  return ok(node.trim());
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
