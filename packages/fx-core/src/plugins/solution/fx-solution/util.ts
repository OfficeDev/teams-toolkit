// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
    PluginConfig,
    Dialog,
    FxError,
    DialogMsg,
    DialogType,
    QuestionType,
    SolutionContext,
    PluginContext,
    Context,
    ConfigMap,
    TeamsAppManifest,
    ok,
    Result,
    err,
    ResultAsync
} from "fx-api";

async function ask(description: string, dialog?: Dialog, defaultAnswer?: string): Promise<Result<string, FxError>> {
    const answer: string | undefined = (
        await dialog?.communicate(
            new DialogMsg(DialogType.Ask, {
                type: QuestionType.Text,
                description,
                defaultAnswer,
            }),
        )
    )?.getAnswer();
    if (!answer) {
        return err({
            name: "invalidUserInput",
            message: "User input should not be empty",
            source: __filename,
            timestamp: new Date(),
        });
    }
    return ok(answer);
}

/**
 * Ask for user input
 *
 * @param dialog communication channel to the core module
 * @param description description of the question.
 */
export function askWithoutDefaultAnswer(description: string, dialog?: Dialog): ResultAsync<string, FxError> {
    return new ResultAsync(ask(description, dialog));
}

/**
 * Ask for user input with a context T for better compose-ability.
 *
 * @param dialog communication channel to the core module
 * @param description description of the question.
 * @param t the context that will be carried with the answer.
 */
export function askWithoutDefaultAnswerWith<T>(
    description: string,
    t: T,
    dialog?: Dialog,
): ResultAsync<[string, T], FxError> {
    return new ResultAsync(ask(description, dialog)).map((answer: string) => {
        return [answer, t];
    });
}

/**
 * A helper function to construct a plugin's context.
 * @param solutionCtx solution context
 * @param pluginIdentifier plugin name
 */
export function getPluginContext(
    solutionCtx: SolutionContext,
    pluginIdentifier: string,
    manifest?: TeamsAppManifest,
    readonly?: boolean
): PluginContext {
    const baseCtx: Context = solutionCtx;
    if ( (readonly === false || readonly === undefined) && !solutionCtx.config.has(pluginIdentifier)) {
        solutionCtx.config.set(pluginIdentifier, new ConfigMap());
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const pluginConfig: PluginConfig = solutionCtx.config.get(pluginIdentifier)!;
    const pluginCtx: PluginContext = {
        ...baseCtx,
        configOfOtherPlugins: solutionCtx.config,
        config: pluginConfig,
        app: manifest? manifest:new TeamsAppManifest(),
    };
    return pluginCtx;
}

/**
 * A curry-ed version of getPluginContext
 * @param solutionCtx solution context
 */
export function getPluginContextConstructor(solutionCtx: SolutionContext): (pluginIdentifier: string) => PluginContext {
    return function(pluginIdentifier: string): PluginContext {
        return getPluginContext(solutionCtx, pluginIdentifier);
    };
}
