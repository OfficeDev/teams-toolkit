// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks";
import {
  err,
  Inputs,
  QTreeNode,
  traverse,
  UserCancelError,
  UserError,
} from "@microsoft/teamsfx-api";
import { environmentManager } from "../../core/environment";
import { NoProjectOpenedError } from "../../core/error";
import { TOOLS } from "../../core/globalVars";
import { CoreHookContext } from "../../core/types";
import { SelectEnvQuestion } from "../question";
import { envUtil } from "../utils/envUtil";
import _ from "lodash";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";
import { pathUtils } from "../utils/pathUtils";
import fs from "fs-extra";
import { InvalidEnvFolderPath } from "../configManager/error";

export function EnvLoaderMW(withLocalEnv: boolean): Middleware {
  return async (ctx: CoreHookContext, next: NextFunction) => {
    const envBefore = _.cloneDeep(process.env);
    try {
      await envLoaderMWImpl(withLocalEnv, ctx, next);
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
  };
}

export async function envLoaderMWImpl(
  withLocalEnv: boolean,
  ctx: CoreHookContext,
  next: NextFunction
): Promise<void> {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const projectPath = inputs.projectPath;
  if (!projectPath) {
    ctx.result = err(new NoProjectOpenedError());
    return;
  }
  if (inputs.ignoreEnvInfo) {
    inputs.env = environmentManager.getDefaultEnvName();
  }
  if (!inputs.env) {
    const question = SelectEnvQuestion();
    const envListRes = await envUtil.listEnv(projectPath);
    if (envListRes.isErr()) {
      ctx.result = err(envListRes.error);
      return;
    }
    if (envListRes.value.length === 0) {
      ctx.result = err(
        new UserError({
          source: "EnvLoaderMW",
          name: "NoEnvFilesError",
          displayMessage: getLocalizedString("core.error.NoEnvFilesError"),
          message: getDefaultString("core.error.NoEnvFilesError"),
        })
      );
      return;
    }
    if (withLocalEnv) {
      question.staticOptions = envListRes.value;
    } else {
      question.staticOptions = envListRes.value.filter(
        (p) => p !== environmentManager.getLocalEnvName()
      );
    }

    const res = await traverse(new QTreeNode(question), inputs, TOOLS.ui);
    if (res.isErr()) {
      TOOLS.logProvider.debug(`[core:env] failed to run question model for target environment.`);
      ctx.result = err(res.error);
      return;
    }
    if (!inputs.env) {
      ctx.result = err(UserCancelError);
      return;
    }
  }

  //for F5 scenario, TTK will create a default .env file if the target env file does not exist
  if (inputs.isLocalDebug) {
    const dotEnvFilePathRes = await pathUtils.getEnvFilePath(projectPath, inputs.env);
    if (dotEnvFilePathRes.isErr()) {
      ctx.result = err(dotEnvFilePathRes.error);
      return;
    }
    const envFilePath = dotEnvFilePathRes.value;
    if (!envFilePath) {
      ctx.result = err(
        new InvalidEnvFolderPath(
          "missing 'environmentFolderPath' field or environment folder not exist"
        )
      );
      return;
    }
    if (!fs.pathExistsSync(envFilePath)) {
      const defaultEnvContent =
        `# Built-in environment variables\nTEAMSFX_ENV=${inputs.env}\n\n` +
        "# Generated during provision, you can also add your own variables\n";
      // "# Secret. You can add your own secret value, prefixed with SECRET_\n";
      await fs.writeFile(envFilePath, defaultEnvContent);
      inputs.createdEnvFile = envFilePath; // record created state for summary report
    }
  }

  const res = await envUtil.readEnv(projectPath, inputs.env);
  if (res.isErr()) {
    ctx.result = err(res.error);
    return;
  }
  ctx.envVars = res.value;
  await next();
}

export const EnvWriterMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  await next();
  const inputs = ctx.arguments[0] as Inputs;
  const env = inputs.env;
  const projectPath = inputs.projectPath;
  const envVars = ctx.envVars;
  if (projectPath && env && envVars) {
    const res = await envUtil.writeEnv(projectPath, env, envVars);
    if (res.isErr()) {
      ctx.result = err(res.error);
      return;
    }
  }
};
