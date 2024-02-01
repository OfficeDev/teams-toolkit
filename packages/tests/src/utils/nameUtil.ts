import { Project } from "./constants";
import * as uuid from "uuid";

export function getAppNamePrefix(): string {
  return `${Project.namePrefix}${
    new Date().getUTCMonth() + 1
  }${new Date().getUTCDate()}`;
}

export function getAppName(suffix: string): string {
  return `${getAppNamePrefix()}${suffix}${uuid.v4().substring(0, 4)}`;
}

export function getScreenshotName(name: string): string {
  return `vscode_${name}_${uuid.v4().substring(0, 4)}`;
}

export function getPlaywrightScreenshotPath(name: string): string {
  return `.test-resources/screenshots/playwright_${name}_${uuid
    .v4()
    .substring(0, 4)}.png`;
}

export function getSampleAppName(name: string): string {
  return `fxui${name.split(" ").join("")}${uuid.v4().substring(0, 4)}`;
}
