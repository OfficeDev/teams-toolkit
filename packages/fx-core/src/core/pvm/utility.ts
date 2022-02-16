/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export function jsonStringifyElegantly(v: any): string {
  return JSON.stringify(v, null, 2);
}
