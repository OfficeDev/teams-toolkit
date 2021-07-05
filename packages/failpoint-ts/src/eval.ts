import { Value } from "./marker";

const ENV_VAR_NAME: string = "FX_FAILPOINTS";

/**
 * Checks whether a failpoint is activated.
 * 
 * @param failpointName 
 * @returns failpoint value if the failpoint identifed by failpointName is activated.
 *          Returns undefined when it's not activated.
 */
export function evaluate(failpointName: string): Value | undefined {
  const env = process.env[ENV_VAR_NAME];
  if (!env) {
    return undefined;
  }

  const vars = env.split(";")
  const found = vars.find((name) => name === failpointName)
  if (!found) {
    return undefined;
  }
  return { kind: "boolean", value: true };
}