import {
  FxError,
  LogProvider,
  Result,
  err,
  returnSystemError,
  v2,
  SystemError,
  returnUserError,
  UserError,
} from "@microsoft/teamsfx-api";
import { PluginDisplayName } from "../../../../common/constants";
import { SolutionError, SolutionSource } from "../constants";

export type Thunk<R> = () => Promise<Result<R, FxError>>;

export type NamedThunk<R> = { pluginName: string; taskName: string; thunk: Thunk<R> };

export async function executeThunks<R>(
  namedThunks: NamedThunk<R>[],
  logger: LogProvider
): Promise<Result<R, FxError>[]> {
  const result = Promise.all(
    namedThunks.map(async (namedThunk) => {
      logger.info(`Running ${namedThunk.pluginName} concurrently`);
      try {
        return namedThunk.thunk();
      } catch (e) {
        if (e instanceof UserError || e instanceof SystemError) {
          return err<R, FxError>(e);
        }
        return err<R, FxError>(
          new SystemError(
            "UnknownError",
            `[SolutionV2.executeConcurrently] unknown error, plugin: ${
              namedThunk.pluginName
            }, taskName: ${namedThunk.taskName}, error: ${JSON.stringify(e)}`,
            SolutionSource
          )
        );
      }
    })
  );
  return result;
}

export async function executeConcurrently<R>(
  namedThunks: NamedThunk<R>[],
  logger: LogProvider
): Promise<v2.FxResult<{ name: string; result: R }[], FxError>> {
  const results = await Promise.all(
    namedThunks.map(async (namedThunk) => {
      logger.info(`Running ${namedThunk.pluginName} concurrently`);
      try {
        return namedThunk.thunk();
      } catch (e) {
        if (e instanceof UserError || e instanceof SystemError) {
          return err(e);
        }
        return err(
          new SystemError(
            "UnknownError",
            `[SolutionV2.executeConcurrently] unknown error, plugin: ${
              namedThunk.pluginName
            }, taskName: ${namedThunk.taskName}, error: ${JSON.stringify(e)}`,
            SolutionSource
          )
        );
      }
    })
  );

  if (logger) {
    logger.info(`${`[${PluginDisplayName.Solution}] Execute Task summary`.padEnd(64, "-")}`);
  }

  let failed = false;
  const ret: { name: string; result: R }[] = [];
  const errors: FxError[] = [];
  for (let i = 0; i < results.length; ++i) {
    const name = `${namedThunks[i].pluginName}-${namedThunks[i].taskName}`;
    const result = results[i];
    logger.info(`${name.padEnd(60, ".")} ${result.isOk() ? "[ok]" : "[failed]"}`);
    if (result.isErr()) {
      failed = true;
      errors.push(result.error);
    } else {
      ret.push({ name: `${namedThunks[i].pluginName}`, result: result.value });
    }
  }
  if (logger)
    logger?.info(
      `${`[${PluginDisplayName.Solution}] Task overall result`.padEnd(60, ".")}${
        failed ? "[failed]" : "[ok]"
      }`
    );

  if (failed) {
    const errMsg = JSON.stringify(errors.map((e) => `${e.name}:${e.message}`));
    return ret.length === 0
      ? new v2.FxFailure(
          returnSystemError(
            new Error(`Failed to run tasks concurrently due to ${errMsg}`),
            SolutionSource,
            SolutionError.InternelError
          )
        )
      : new v2.FxPartialSuccess(ret, mergeFxErrors(errors));
  }

  return new v2.FxSuccess(ret);
}

function mergeFxErrors(errors: FxError[]): FxError {
  let hasSystemError = false;
  const errMsgs: string[] = [];
  for (const err of errors) {
    if (err instanceof SystemError) {
      hasSystemError = true;
    }
    errMsgs.push(`${err.name}:${err.message}`);
  }
  return hasSystemError
    ? returnSystemError(
        new Error(errMsgs.join(";")),
        SolutionSource,
        SolutionError.FailedToExecuteTasks
      )
    : returnUserError(
        new Error(errMsgs.join(";")),
        SolutionSource,
        SolutionError.FailedToExecuteTasks
      );
}
