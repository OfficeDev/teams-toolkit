import {
  FxError,
  LogProvider,
  Result,
  err,
  v2,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import { PluginDisplayName } from "../../common/constants";
import { SolutionError, SolutionSource } from "../constants";

export type Thunk<R> = () => Promise<Result<R, FxError>>;

export type NamedThunk<R> = { pluginName: string; taskName: string; thunk: Thunk<R> };

export async function executeConcurrently<R>(
  namedThunks: NamedThunk<R>[],
  logger: LogProvider,
  concurrent = true
): Promise<v2.FxResult<{ name: string; result: R }[], FxError>> {
  let results;
  if (concurrent) {
    results = await Promise.all(
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
              SolutionSource,
              "UnknownError",
              `[SolutionV2.executeConcurrently] unknown error, plugin: ${
                namedThunk.pluginName
              }, taskName: ${namedThunk.taskName}, error: ${JSON.stringify(e)}`
            )
          );
        }
      })
    );
  } else {
    results = [];
    for (const namedThunk of namedThunks) {
      logger.info(`Running ${namedThunk.pluginName} concurrently`);
      let res;
      try {
        res = await namedThunk.thunk();
      } catch (e) {
        if (e instanceof UserError || e instanceof SystemError) {
          res = err(e);
        } else {
          res = err(
            new SystemError(
              SolutionSource,
              "UnknownError",
              `[SolutionV2.executeConcurrently] unknown error, plugin: ${
                namedThunk.pluginName
              }, taskName: ${namedThunk.taskName}, error: ${JSON.stringify(e)}`
            )
          );
        }
      }
      results.push(res);
    }
  }

  logger?.info(`${`[${PluginDisplayName.Solution}] Execute Task summary`.padEnd(64, "-")}`);

  let failed = false;
  const ret: { name: string; result: R }[] = [];
  const errors: FxError[] = [];
  for (let i = 0; i < results.length; ++i) {
    const name = `${namedThunks[i].pluginName}:${namedThunks[i].taskName}`;
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
    if (ret.length === 0) {
      return new v2.FxFailure(mergeFxErrors(errors));
    } else {
      return new v2.FxPartialSuccess(ret, mergeFxErrors(errors));
    }
  }

  return new v2.FxSuccess(ret);
}

function mergeFxErrors(errors: FxError[]): FxError {
  if (errors.length === 1) {
    return errors[0];
  }
  let hasSystemError = false;
  const errMsgs: string[] = [];
  for (const err of errors) {
    if (err instanceof SystemError) {
      hasSystemError = true;
    }
    errMsgs.push(`${err.name}:${err.message}`);
  }
  return hasSystemError
    ? new SystemError(SolutionSource, SolutionError.FailedToExecuteTasks, errMsgs.join(";"))
    : new UserError(SolutionSource, SolutionError.FailedToExecuteTasks, errMsgs.join(";"));
}
