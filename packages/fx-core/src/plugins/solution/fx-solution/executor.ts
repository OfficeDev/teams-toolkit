// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ok, Result, FxError, PluginContext, LogProvider } from "@microsoft/teamsfx-api";

export type LifecyclesWithContext = [
  OmitThisParameter<(ctx: PluginContext) => Promise<Result<any, FxError>>> | undefined,
  PluginContext,
  string
];

/**
 * Execute plugin lifecycles one by one with its associated context.
 *
 */
export async function executeSequentially(
  step: string,
  lifecycleAndContext: LifecyclesWithContext[]
): Promise<Result<any, FxError>> {
  let logger: LogProvider | undefined;
  const results: (Result<any, FxError> | undefined)[] = [];
  for (const pair of lifecycleAndContext) {
    const lifecycle = pair[0];
    const context = pair[1];
    logger = context.logProvider;
    if (lifecycle) {
      const result = await lifecycle(context);
      results.push(result);
      if (result.isErr()) {
        break;
      }
    } else {
      results.push(undefined);
    }
  }
  if (logger) logger?.info(`${("[Solution] Execute " + step + "Task summary").padEnd(64, "-")}`);
  for (let i = 0; i < results.length; ++i) {
    const pair = lifecycleAndContext[i];
    const lifecycle = pair[0];
    const context = pair[1];
    const pluginName = pair[2];
    const result = results[i];
    if (!result || !lifecycle) continue;
    const taskname = lifecycle?.name.replace("bound ", "");
    context.logProvider?.info(
      `${(pluginName + "." + taskname).padEnd(60, ".")} ${result.isOk() ? "[ok]" : "[failed]"}`
    );
    if (result.isErr()) {
      if (logger)
        logger?.info(`${("[Solution] " + step + "Task overall result").padEnd(60, ".")}[failed]`);
      return result;
    }
  }
  if (logger) logger?.info(`${("[Solution] " + step + "Task overall result").padEnd(60, ".")}[ok]`);
  return ok(undefined);
}

/**
 * ConcurrentExecutor will concurrently run the plugin lifecycles with
 * its associated context.
 *
 * Currently, on success, return value is discarded by returning undefined on sucess.
 */
export async function executeConcurrently(
  step: string,
  lifecycleAndContext: LifecyclesWithContext[]
): Promise<Result<any, FxError>[]> {
  let logger: LogProvider | undefined;
  const promises: Promise<Result<any, FxError>>[] = lifecycleAndContext.map(
    async (pair: LifecyclesWithContext): Promise<Result<any, FxError>> => {
      const lifecycle = pair[0];
      const context = pair[1];
      logger = context.logProvider;
      if (lifecycle) {
        const res = lifecycle(context);
        return res;
      } else {
        return ok(undefined);
      }
    }
  );

  const results = await Promise.all(promises);
  if (logger) logger?.info(`${("[Solution] Execute " + step + "Task summary").padEnd(64, "-")}`);
  let failed = false;
  for (let i = 0; i < results.length; ++i) {
    const pair = lifecycleAndContext[i];
    const lifecycle = pair[0];
    const context = pair[1];
    const pluginName = pair[2];
    const result = results[i];
    if (!result || !lifecycle) continue;
    const taskname = lifecycle?.name.replace("bound ", "");
    context.logProvider?.info(
      `${(pluginName + "." + taskname).padEnd(60, ".")} ${result.isOk() ? "[ok]" : "[failed]"}`
    );
    if (result.isErr()) {
      failed = true;
    }
  }
  if (logger)
    logger?.info(
      `${("[Solution] " + step + "Task overall result").padEnd(60, ".")}${
        failed ? "[failed]" : "[ok]"
      }`
    );
  return results;
}

/**
 * Executes preLifecycles, lifecycles, postCycles in order. If one of the steps failes, following steps won't run.
 *
 * @param preLifecycles
 * @param lifecycles
 * @param postLifecycles
 */
export async function executeLifecycles(
  preLifecycles: LifecyclesWithContext[],
  lifecycles: LifecyclesWithContext[],
  postLifecycles: LifecyclesWithContext[],
  onPreLifecycleFinished?: (result?: any[]) => Promise<Result<any, FxError>>,
  onLifecycleFinished?: (result?: any[]) => Promise<Result<any, FxError>>,
  onPostLifecycleFinished?: (result?: any[]) => Promise<Result<any, FxError>>
): Promise<Result<any, FxError>> {
  // Questions are asked sequentially during preLifecycles.
  const preResult = await executeSequentially("pre", preLifecycles);
  if (preResult.isErr()) {
    return preResult;
  }
  if (onPreLifecycleFinished) {
    const result = await onPreLifecycleFinished();
    if (result.isErr()) {
      return result;
    }
  }

  const results = await executeConcurrently("", lifecycles);
  for (const result of results) {
    if (result.isErr()) {
      return result;
    }
  }
  if (onLifecycleFinished) {
    const onLifecycleFinishedResult = await onLifecycleFinished(results);
    if (onLifecycleFinishedResult.isErr()) {
      return onLifecycleFinishedResult;
    }
  }

  const postResults = await executeConcurrently("post", postLifecycles);
  for (const result of postResults) {
    if (result.isErr()) {
      return result;
    }
  }
  if (onPostLifecycleFinished) {
    const result = await onPostLifecycleFinished();
    if (result.isErr()) {
      return result;
    }
  }
  return ok(undefined);
}
