import { FxError, LogProvider, Result, ok, err } from "@microsoft/teamsfx-api";
import { PluginDisplayName } from "../../../../common/constants";

export type Thunk<R> = () => Promise<Result<R, FxError>>;

export type NamedThunk<R> = { name: string; thunk: Thunk<R> };

export async function executeConcurrently<R>(
  namedThunks: NamedThunk<R>[],
  logger: LogProvider
): Promise<Result<R, FxError>[]> {
  const results = await Promise.all(
    namedThunks.map(async (namedThunk) => {
      logger.info(`Running ${namedThunk.name} concurrently`);
      return namedThunk.thunk();
    })
  );

  if (logger) {
    logger.info(`${`[${PluginDisplayName.Solution}] Execute Task summary`.padEnd(64, "-")}`);
  }

  let failed = false;
  for (let i = 0; i < results.length; ++i) {
    const name = namedThunks[i].name;
    const result = results[i];
    logger.info(`${name.padEnd(60, ".")} ${result.isOk() ? "[ok]" : "[failed]"}`);
    if (result.isErr()) {
      failed = true;
    }
  }
  if (logger)
    logger?.info(
      `${`[${PluginDisplayName.Solution}] Task overall result`.padEnd(60, ".")}${
        failed ? "[failed]" : "[ok]"
      }`
    );

  return results;
}
