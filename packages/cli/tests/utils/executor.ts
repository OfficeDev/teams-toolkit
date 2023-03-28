// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { execAsync } from "../e2e/commonUtils";
import { Capability } from "./constants";

export class Executor {
  static async execute(
    command: string,
    cwd: string,
    processEnv?: NodeJS.ProcessEnv,
    timeout?: number
  ) {
    try {
      const result = await execAsync(command, {
        cwd,
        env: processEnv ?? process.env,
        timeout: timeout ?? 0,
      });
      if (result.stderr) {
        /// the command exit with 0
        console.log(`[Success] "${command}" in ${cwd} with some stderr: ${result.stderr}`);
      } else {
        console.log(`[Success] "${command}" in ${cwd}.`);
      }
      return { ...result, success: true };
    } catch (e) {
      if (e.killed && e.signal == "SIGTERM") {
        console.error(`[Failed] "${command}" in ${cwd}. Timeout and killed.`);
      } else {
        console.error(`[Failed] "${command}" in ${cwd} with error: ${e.message}`);
      }
      return { stdout: "", stderr: e.message as string, success: false };
    }
  }

  static concatProcessEnv(processEnv: NodeJS.ProcessEnv, env: Record<string, string>) {
    return Object.assign({}, processEnv, env);
  }

  static async createProject(
    workspace: string,
    appName: string,
    capability: Capability,
    language: ProgrammingLanguage,
    customized: Record<string, string> = {}
  ) {
    const command =
      `teamsfx new --interactive false --app-name ${appName} --capabilities ${capability} --programming-language ${language} ` +
      Object.entries(customized)
        .map(([key, value]) => "--" + key + " " + value)
        .join(" ");
    return this.execute(command, workspace);
  }

  static async addEnv(workspace: string, newEnv: string, env = "dev") {
    const command = `teamsfx env add ${newEnv} --env ${env}`;
    return this.execute(command, workspace);
  }

  static async addSPFxWebPart(
    workspace: string,
    spfxFolder: string,
    webpartName: string,
    manifestPath: string,
    localManifestPath: string
  ) {
    const command =
      `teamsfx add SPFxWebPart --spfx-webpart-name ${webpartName}` +
      ` --spfx-folder ${spfxFolder} --manifest-path ${manifestPath}` +
      ` --local-manifest-path ${localManifestPath}` +
      ` --spfx-install-latest-package true`;
    return this.execute(command, workspace);
  }

  static async provision(workspace: string, env = "dev") {
    const command = `teamsfx provision --env ${env}`;
    return this.execute(command, workspace);
  }

  static async validate(workspace: string, env = "dev") {
    const command = `teamsfx validate --env ${env}`;
    return this.execute(command, workspace);
  }

  static async deploy(workspace: string, env = "dev") {
    const command = `teamsfx deploy --env ${env}`;
    return this.execute(command, workspace);
  }

  static async publish(workspace: string, env = "dev") {
    const command = `teamsfx publish --env ${env}`;
    return this.execute(command, workspace);
  }

  static async installCLI(workspace: string, version: string, global: boolean) {
    if (global) {
      const command = `npm install -g @microsoft/teamsfx-cli@${version}`;
      return this.execute(command, workspace);
    } else {
      const command = `npm install @microsoft/teamsfx-cli@${version}`;
      return this.execute(command, workspace);
    }
  }
}
