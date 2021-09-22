// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import {
  ConfigMap,
  EnvInfo,
  err,
  FxError,
  Inputs,
  Json,
  ok,
  ProjectSettings,
  QTreeNode,
  Result,
  SolutionConfig,
  SolutionContext,
  Tools,
  traverse,
  UserCancelError,
} from "@microsoft/teamsfx-api";
import { isV2 } from "..";
import { CoreHookContext, FxCore, isMultiEnvEnabled } from "../..";
import {
  NoProjectOpenedError,
  ProjectEnvNotExistError,
  ProjectSettingsUndefinedError,
  NonActiveEnvError,
} from "../error";
import { LocalCrypto } from "../crypto";
import { environmentManager } from "../environment";
import {
  DEFAULT_FUNC_NAME,
  GLOBAL_CONFIG,
  PluginNames,
  PROGRAMMING_LANGUAGE,
} from "../../plugins/solution/fx-solution/constants";
import {
  getQuestionNewTargetEnvironmentName,
  QuestionSelectSourceEnvironment,
  QuestionSelectTargetEnvironment,
} from "../question";
import { desensitize } from "./questionModel";
import { shouldIgnored } from "./projectSettingsLoader";
import { PermissionRequestFileProvider } from "../permissionRequest";
import { newEnvInfo } from "../tools";

const newTargetEnvNameOption = "+ new environment";
const activeMark = " (active)";
let activeEnv: string | undefined;

export type CreateEnvCopyInput = {
  targetEnvName: string;
  sourceEnvName: string;
};

export function EnvInfoLoaderMW(skip: boolean): Middleware {
  return async (ctx: CoreHookContext, next: NextFunction) => {
    if (shouldIgnored(ctx)) {
      await next();
      return;
    }

    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    if (inputs.previewType && inputs.previewType === "local") {
      skip = true;
    }

    if (!ctx.projectSettings) {
      ctx.result = err(ProjectSettingsUndefinedError());
      return;
    }

    const core = ctx.self as FxCore;

    let targetEnvName: string;
    if (!skip && isMultiEnvEnabled()) {
      if (inputs.askEnvSelect) {
        const result = await askTargetEnvironment(core.tools, inputs);
        if (result.isErr()) {
          ctx.result = err(result.error);
          return;
        }
        targetEnvName = result.value;
        ctx.ui?.showMessage(
          "info",
          `[${targetEnvName}] is selected as the target environment to ${inputs.stage}`,
          false
        );
      } else if (inputs.env) {
        const result = await useUserSetEnv(inputs);
        if (result.isErr()) {
          ctx.result = result.error;
          return;
        }
        targetEnvName = result.value;
      } else if (activeEnv) {
        targetEnvName = activeEnv;
      } else {
        ctx.result = err(NonActiveEnvError);
        return;
      }
    } else {
      targetEnvName = environmentManager.getDefaultEnvName();
    }

    const result = await loadSolutionContext(
      core.tools,
      inputs,
      ctx.projectSettings,
      ctx.projectIdMissing,
      targetEnvName,
      inputs.ignoreEnvInfo
    );
    if (result.isErr()) {
      ctx.result = err(result.error);
      return;
    }

    if (isV2()) {
      const envInfo = result.value.envInfo;
      const profile: Json = {};
      for (const key of envInfo.profile.keys()) {
        const map = envInfo.profile.get(key);
        if (map) {
          profile[key] = (map as ConfigMap).toJSON();
        }
      }
      ctx.envInfoV2 = { envName: envInfo.envName, config: envInfo.config, profile: profile };
    } else {
      ctx.solutionContext = result.value;
    }
    await next();
  };
}

export function setActiveEnv(env: string) {
  activeEnv = env;
}

export async function loadSolutionContext(
  tools: Tools,
  inputs: Inputs,
  projectSettings: ProjectSettings,
  projectIdMissing?: boolean,
  targetEnvName?: string,
  ignoreEnvInfo = false
): Promise<Result<SolutionContext, FxError>> {
  if (!inputs.projectPath) {
    return err(NoProjectOpenedError());
  }

  const cryptoProvider = new LocalCrypto(projectSettings.projectId);
  // ensure backwards compatibility:
  // no need to decrypt the secrets in *.userdata for previous TeamsFx project, which has no project id.
  const envDataResult = await environmentManager.loadEnvInfo(
    inputs.projectPath,
    targetEnvName,
    projectIdMissing ? undefined : cryptoProvider
  );

  let envInfo: EnvInfo;
  if (envDataResult.isErr()) {
    if (ignoreEnvInfo) {
      // ignore env loading error
      tools.logProvider.info(
        `[core:env] failed to load '${targetEnvName}' environment, skipping because ignoreEnvInfo is set to true, error: ${envDataResult.error.message}`
      );
      envInfo = newEnvInfo();
    } else {
      return err(envDataResult.error);
    }
  } else {
    envInfo = envDataResult.value;
  }

  // migrate programmingLanguage and defaultFunctionName to project settings if exists in previous env config
  const solutionConfig = envInfo.profile as SolutionConfig;
  upgradeProgrammingLanguage(solutionConfig, projectSettings);
  upgradeDefaultFunctionName(solutionConfig, projectSettings);

  const solutionContext: SolutionContext = {
    projectSettings: projectSettings,
    envInfo,
    root: inputs.projectPath || "",
    ...tools,
    ...tools.tokenProvider,
    answers: inputs,
    cryptoProvider: cryptoProvider,
    permissionRequestProvider: new PermissionRequestFileProvider(inputs.projectPath),
  };

  return ok(solutionContext);
}

export function upgradeProgrammingLanguage(
  solutionConfig: SolutionConfig,
  projectSettings: ProjectSettings
) {
  const programmingLanguage = solutionConfig.get(GLOBAL_CONFIG)?.get(PROGRAMMING_LANGUAGE);
  if (programmingLanguage) {
    // add programmingLanguage in project settings
    projectSettings.programmingLanguage = programmingLanguage;

    // remove programmingLanguage in solution config
    solutionConfig.get(GLOBAL_CONFIG)?.delete(PROGRAMMING_LANGUAGE);
  }
}

export function upgradeDefaultFunctionName(
  solutionConfig: SolutionConfig,
  projectSettings: ProjectSettings
) {
  // upgrade defaultFunctionName if exists.
  const defaultFunctionName = solutionConfig.get(PluginNames.FUNC)?.get(DEFAULT_FUNC_NAME);
  if (defaultFunctionName) {
    // add defaultFunctionName in project settings
    projectSettings.defaultFunctionName = defaultFunctionName;

    // remove defaultFunctionName in function plugin's config
    solutionConfig.get(PluginNames.FUNC)?.delete(DEFAULT_FUNC_NAME);
  }
}

export async function askTargetEnvironment(
  tools: Tools,
  inputs: Inputs,
  lastUsed?: string
): Promise<Result<string, FxError>> {
  const getQuestionRes = await getQuestionsForTargetEnv(inputs, lastUsed ?? activeEnv);
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

    const desensitized = desensitize(node, inputs);
    tools.logProvider.info(
      `[core:env] success to run question model for target environment, answers:${JSON.stringify(
        desensitized
      )}`
    );
  }

  if (!inputs.targetEnvName) {
    return err(UserCancelError);
  }

  let targetEnvName = inputs.targetEnvName;
  if (targetEnvName.endsWith(activeMark)) {
    targetEnvName = targetEnvName.slice(0, targetEnvName.indexOf(activeMark));
  }

  return ok(targetEnvName);
}

export async function askNewEnvironment(
  ctx: CoreHookContext,
  inputs: Inputs
): Promise<CreateEnvCopyInput | undefined> {
  const getQuestionRes = await getQuestionsForNewEnv(inputs);
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

  const sourceEnvName = inputs.sourceEnvName!;
  let selectedEnvName: string;
  if (sourceEnvName?.endsWith(activeMark)) {
    selectedEnvName = sourceEnvName.slice(0, sourceEnvName.indexOf(activeMark));
  } else {
    selectedEnvName = sourceEnvName;
  }

  return {
    targetEnvName: inputs.newTargetEnvName,
    sourceEnvName: selectedEnvName,
  };
}

async function useUserSetEnv(inputs: Inputs): Promise<Result<string, FxError>> {
  const checkEnv = await environmentManager.checkEnvExist(inputs.projectPath!, inputs.env);
  if (checkEnv.isErr()) {
    return err(checkEnv.error);
  }

  const envExists = checkEnv.value;
  if (!envExists) {
    return err(ProjectEnvNotExistError(inputs.env));
  }

  return ok(inputs.env);
}

async function getQuestionsForTargetEnv(
  inputs: Inputs,
  lastUsed?: string
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (!inputs.projectPath) {
    return err(NoProjectOpenedError());
  }

  const envProfilesResult = await environmentManager.listEnvConfigs(inputs.projectPath);
  if (envProfilesResult.isErr()) {
    return err(envProfilesResult.error);
  }

  const envList = reOrderEnvironments(envProfilesResult.value, lastUsed);
  const selectEnv = QuestionSelectTargetEnvironment;
  selectEnv.staticOptions = envList;

  const node = new QTreeNode(selectEnv);

  const childNode = new QTreeNode(getQuestionNewTargetEnvironmentName(inputs.projectPath));
  childNode.condition = { equals: newTargetEnvNameOption };

  node.addChild(childNode);

  return ok(node.trim());
}

async function getQuestionsForNewEnv(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (!inputs.projectPath) {
    return err(NoProjectOpenedError());
  }

  const node = new QTreeNode(getQuestionNewTargetEnvironmentName(inputs.projectPath));

  const envProfilesResult = await environmentManager.listEnvConfigs(inputs.projectPath);
  if (envProfilesResult.isErr()) {
    return err(envProfilesResult.error);
  }

  const envList = reOrderEnvironments(envProfilesResult.value, activeEnv);
  const selectSourceEnv = QuestionSelectSourceEnvironment;
  selectSourceEnv.staticOptions = envList;
  selectSourceEnv.default = activeEnv + activeMark;

  const selectSourceEnvNode = new QTreeNode(selectSourceEnv);
  node.addChild(selectSourceEnvNode);

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

  return [lastUsed + activeMark]
    .concat(environments.slice(0, index))
    .concat(environments.slice(index + 1));
}
