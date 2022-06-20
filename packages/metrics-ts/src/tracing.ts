import { nanoid } from "nanoid";

/**
 * TODO: make it safe
 */
export function traceId(): string {
  if (process.env.METAOS_TRACE_ID) {
    return process.env.METAOS_TRACE_ID;
  } else {
    const traceId = nanoid();
    process.env.METAOS_TRACE_ID = traceId;
    return traceId;
  }
}
