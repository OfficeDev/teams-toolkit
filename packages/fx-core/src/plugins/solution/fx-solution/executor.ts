// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ok, Result, FxError, PluginContext } from "teamsfx-api";

export type LifecyclesWithContext = [
    OmitThisParameter<(ctx: PluginContext) => Promise<Result<any, FxError>>> | undefined,
    PluginContext,
    string,
];

/**
 * Execute plugin lifecycles one by one with its associated context.
 *
 */
export async function executeSequentially(
    lifecycleAndContext: LifecyclesWithContext[],
): Promise<Result<any, FxError>> {
    for (const pair of lifecycleAndContext) {
        const lifecycle = pair[0];
        const context = pair[1];
        const pluginName = pair[2];
        if (lifecycle) {
            const taskname = lifecycle.name.replace("bound ", "");
            context.logProvider?.info(`Execute sequentially ${pluginName}.${taskname}() -------- start!`);
            const result = await lifecycle(context);
            if (result.isErr()) {
                context.logProvider?.info(`Execute sequentially ${pluginName}.${taskname}() -------- failed!`);
                return result;
            }
            context.logProvider?.info(`Execute sequentially ${pluginName}.${taskname}() -------- success!`);
        }
    }

    return ok(undefined);
}

/**
 * ConcurrentExecutor will concurrently run the plugin lifecycles with
 * its associated context.
 *
 * Currently, on success, return value is discarded by returning undefined on sucess.
 */
export async function executeConcurrently(
    lifecycleAndContext: LifecyclesWithContext[],
): Promise<Result<any, FxError>> {
    const promises: Promise<Result<any, FxError>>[] = lifecycleAndContext.map(
        async (pair: LifecyclesWithContext): Promise<Result<any, FxError>> => {
            const lifecycle = pair[0];
            const context = pair[1];
            const pluginName = pair[2];
            if (lifecycle) {
                const taskname = lifecycle.name.replace("bound ", "");
                context.logProvider?.info(`Execute concurrently ${pluginName}.${taskname}() -------- start!`);
                const res = lifecycle(context);
                context.logProvider?.info(`Execute concurrently ${pluginName}.${taskname}() -------- finish!`);
                return res;
            } else {
                return ok(undefined);
            }
        },
    );

    const results = await Promise.all(promises);
    for (const result of results) {
        if (result.isErr()) {
            return result;
        }
    }
    return ok(undefined);
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
    onPreLifecycleFinished?: () => Promise<Result<any, FxError>>,
    onLifecycleFinished?: () => Promise<Result<any, FxError>>,
    onPostLifecycleFinished?: () => Promise<Result<any, FxError>>,
): Promise<Result<any, FxError>> {
    // Questions are asked sequentially during preLifecycles.
    const preResult = await executeSequentially(preLifecycles);
    if (preResult.isErr()) {
        return preResult;
    }
    if (onPreLifecycleFinished) {
        const result = await onPreLifecycleFinished();
        if (result.isErr()) {
            return result;
        }
    }

    const result = await executeConcurrently(lifecycles);
    if (result.isErr()) {
        return result;
    }
    if (onLifecycleFinished) {
        const result = await onLifecycleFinished();
        if (result.isErr()) {
            return result;
        }
    }

    const postResult = await executeConcurrently(postLifecycles);
    if (postResult.isErr()) {
        return postResult;
    }
    if (onPostLifecycleFinished) {
        const result = await onPostLifecycleFinished();
        if (result.isErr()) {
            return result;
        }
    }
    return postResult;
}
