import * as path from "path";

export function getResourceFolder(): string {
  return path.resolve(__dirname, "../resource");
}
