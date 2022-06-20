import { nanoid } from "nanoid";
import { env } from "process";

/**
 * TODO: make it safe
 */
export function traceId(): string {
  if (env.METAOS_TRACE_ID) {
    return env.METAOS_TRACE_ID;
  } else {
    const traceId = nanoid();
    env.METAOS_TRACE_ID = traceId;
    return traceId;
  }
}
