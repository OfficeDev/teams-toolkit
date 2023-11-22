// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import semver from "semver";
import * as uuid from "uuid";
import { parse } from "yaml";

import { Colors, Inputs, Platform } from "@microsoft/teamsfx-api";
import { SampleConfig, sampleProvider } from "@microsoft/teamsfx-core";

import { teamsAppFileName } from "./constants";
import CLIUIInstance from "./userInteraction";

export function toLocaleLowerCase(arg: any): any {
  if (typeof arg === "string") {
    return arg.toLocaleLowerCase();
  } else if (arg instanceof Array) {
    return arg.map((s: string) => s.toLocaleLowerCase());
  } else return arg;
}

export function isWorkspaceSupported(workspace: string): boolean {
  const p = workspace;

  const checklist = [p, path.join(p, teamsAppFileName)];

  for (const fp of checklist) {
    if (!fs.existsSync(path.resolve(fp))) {
      return false;
    }
  }
  return true;
}

// Only used for telemetry
export function getSettingsVersion(rootFolder: string | undefined): string | undefined {
  if (!rootFolder) {
    return undefined;
  }
  if (isWorkspaceSupported(rootFolder)) {
    const filePath = path.join(rootFolder, teamsAppFileName);
    if (!fs.existsSync(filePath)) {
      return undefined;
    }

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const configuration = parse(fileContent);
      return configuration.version;
    } catch (e) {
      return undefined;
    }
  }
  return undefined;
}

export function getSystemInputs(projectPath?: string, env?: string): Inputs {
  const systemInputs: Inputs = {
    platform: Platform.CLI,
    projectPath: projectPath,
    correlationId: uuid.v4(),
    env: env,
    nonInteractive: false,
  };
  return systemInputs;
}

export function getColorizedString(message: Array<{ content: string; color: Colors }>): string {
  // Color support is automatically detected by chalk
  const colorizedMessage = message
    .map((item) => {
      switch (item.color) {
        case Colors.BRIGHT_WHITE:
          return chalk.whiteBright(item.content);
        case Colors.WHITE:
          return chalk.white(item.content);
        case Colors.BRIGHT_MAGENTA:
          return chalk.magentaBright(item.content);
        case Colors.BRIGHT_GREEN:
          return chalk.greenBright(item.content);
        case Colors.BRIGHT_RED:
          return chalk.redBright(item.content);
        case Colors.BRIGHT_YELLOW:
          return chalk.yellowBright(item.content);
        case Colors.BRIGHT_CYAN:
          return chalk.cyanBright.underline(item.content);
        default:
          return item.content;
      }
    })
    .join("");
  return colorizedMessage + (process.stdout.isTTY ? "\u00A0\u001B[K" : "");
}

/**
 * @returns the version of cli.
 */
let version: string;
export function getVersion(): string {
  if (version) return version;
  const pkgPath = path.resolve(__dirname, "..", "package.json");
  const pkgContent = fs.readJsonSync(pkgPath);
  version = pkgContent.version;
  return version;
}

export interface Sample {
  tags: string[];
  name: string;
  description: string;
  id: string;
  url?: string;
}

export async function getTemplates(): Promise<Sample[]> {
  const version = getVersion();
  const availableSamples = (await sampleProvider.SampleCollection).samples.filter(
    (sample: SampleConfig) => {
      if (sample.minimumCliVersion !== undefined) {
        return semver.gte(version, sample.minimumCliVersion);
      }
      if (sample.maximumCliVersion !== undefined) {
        return semver.lte(version, sample.maximumCliVersion);
      }
      return true;
    }
  );
  const samples = availableSamples.map((sample: SampleConfig) => {
    const info = sample.downloadUrlInfo;
    return {
      tags: sample.tags,
      name: sample.title,
      description: sample.shortDescription,
      id: sample.id,
      url: `https://github.com/${info.owner}/${info.repository}/tree/${info.ref}/${info.dir}`,
    };
  });
  return samples;
}

export function editDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;

  // Create a 2D array to store the edit distances
  const dp: number[][] = new Array(len1 + 1).fill(0).map(() => new Array(len2 + 1).fill(0));

  // Initialize the first row and column
  for (let i = 0; i <= len1; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    dp[0][j] = j;
  }

  // Calculate the edit distance using dynamic programming
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // Deletion
        dp[i][j - 1] + 1, // Insertion
        dp[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return dp[len1][len2];
}
