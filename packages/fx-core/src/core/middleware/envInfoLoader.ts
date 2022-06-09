// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import {
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
  Stage,
  Tools,
  traverse,
  UserCancelError,
} from "@microsoft/teamsfx-api";
import { TOOLS } from "../globalVars";
import {
  NoProjectOpenedError,
  ProjectEnvNotExistError,
  ProjectSettingsUndefinedError,
} from "../error";
import { LocalCrypto } from "../crypto";
import { environmentManager, newEnvInfo } from "../environment";
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
import { shouldIgnored } from "./projectSettingsLoader";
import { PermissionRequestFileProvider } from "../permissionRequest";
import { legacyConfig2EnvState } from "../../plugins/resource/utils4v2";
import { CoreHookContext } from "../types";
import { isConfigUnifyEnabled } from "../..";
import { getLocalAppName } from "../../plugins/resource/appstudio/utils/utils";

const newTargetEnvNameOption = "+ new environment";
const lastUsedMark = " (last used)";
export let lastUsedEnv: string | undefined;

export type CreateEnvCopyInput = {
  targetEnvName: string;
  sourceEnvName: string;
};

export function EnvInfoLoaderMW(skip: boolean): Middleware {
  return async (ctx: CoreHookContext, next: NextFunction) => {
    // if the feature flag TEAMSFX_CONFIG_UNIFY is enabled,
    // don't skip the middleware for local debug.
    if (ctx.method === "localDebug" || ctx.method === "localDebugV2") {
      skip = !isConfigUnifyEnabled();
    }

    if (shouldIgnored(ctx)) {
      await next();
      return;
    }

    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    if (!ctx.projectSettings) {
      ctx.result = err(ProjectSettingsUndefinedError());
      return;
    }

    if (!inputs.projectPath) {
      ctx.result = err(new NoProjectOpenedError());
      return;
    }

    // make sure inputs.env always has value so telemetry can use it.
    const envRes = await getTargetEnvName(skip, inputs, ctx);
    if (envRes.isErr()) {
      ctx.result = err(envRes.error);
      return;
    }
    inputs.env = envRes.value;

    const result = await loadSolutionContext(
      inputs,
      ctx.projectSettings,
      inputs.env,
      skip || inputs.ignoreEnvInfo
    );
    if (result.isErr()) {
      ctx.result = err(result.error);
      return;
    }

    ctx.solutionContext = result.value;

    const envInfo = result.value.envInfo;
    const state: Json = legacySolutionConfig2EnvState(envInfo.state);
    ctx.envInfoV2 = { envName: envInfo.envName, config: envInfo.config, state };
    await next();
  };
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

/**
 * Converts solution config map to envInfo state Json compatible to API v2.
 * e.g. Map("solution" -> Map("tenantId" -> "aaa", "secret1": "bbb") } will be converted to
 * {"solution": { "output": { "tenantId": "aaa" }, "secrets": { "secret1": "bbb" } } }.
 * secret field names are now a hard-coded list collected from all first party plugins.
 *
 * @param solutionConfig solution config map
 * @returns envInfo state Json with output and secrets fields.
 */
function legacySolutionConfig2EnvState(solutionConfig: SolutionConfig): Json {
  const output: Json = {};
  for (const [pluginName, pluginConfig] of solutionConfig) {
    if (pluginConfig instanceof Map) {
      output[pluginName] = legacyConfig2EnvState(pluginConfig, pluginName);
    } else {
      throw Error(`invalid config type[${typeof pluginConfig}].
          pluginName[${pluginName}]. content[${JSON.stringify(pluginName)}]`);
    }
  }

  return output;
}

export async function loadSolutionContext(
  inputs: Inputs,
  projectSettings: ProjectSettings,
  targetEnvName?: string,
  ignoreEnvInfo = false
): Promise<Result<SolutionContext, FxError>> {
  if (!inputs.projectPath) {
    return err(new NoProjectOpenedError());
  }

  const cryptoProvider = new LocalCrypto(projectSettings.projectId);

  let envInfo: EnvInfo;
  // in pre-multi-env case, envInfo is always loaded.
  if (ignoreEnvInfo) {
    envInfo = newEnvInfo();
  } else {
    // ensure backwards compatibility:
    // project id will be generated for previous TeamsFx project.
    // Decrypting the secrets in *.userdata with generated project id works because secrets doesn't have prefix.
    const envDataResult = await environmentManager.loadEnvInfo(
      inputs.projectPath,
      cryptoProvider,
      targetEnvName
    );

    if (envDataResult.isErr()) {
      return err(envDataResult.error);
    }
    envInfo = envDataResult.value as EnvInfo;
  }

  // migrate programmingLanguage and defaultFunctionName to project settings if exists in previous env config
  const solutionConfig = envInfo.state as SolutionConfig;
  upgradeProgrammingLanguage(solutionConfig, projectSettings);
  upgradeDefaultFunctionName(solutionConfig, projectSettings);

  const solutionContext: SolutionContext = {
    projectSettings: projectSettings,
    envInfo,
    root: inputs.projectPath || "",
    ...TOOLS,
    ...TOOLS.tokenProvider,
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
      return err(ProjectEnvNotExistError(env));
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

  const envProfilesResult = await environmentManager.listRemoteEnvConfigs(inputs.projectPath);
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
  inputs: Inputs,
  lastUsed?: string
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (!inputs.projectPath) {
    return err(new NoProjectOpenedError());
  }
  const group = new QTreeNode({ type: "group" });

  const newEnvNameNode = new QTreeNode(getQuestionNewTargetEnvironmentName(inputs.projectPath));
  group.addChild(newEnvNameNode);

  const envProfilesResult = await environmentManager.listRemoteEnvConfigs(inputs.projectPath);
  if (envProfilesResult.isErr()) {
    return err(envProfilesResult.error);
  }

  const envList = reOrderEnvironments(envProfilesResult.value, lastUsed);
  const selectSourceEnv = QuestionSelectSourceEnvironment;
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
