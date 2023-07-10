// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { execAsync, editDotEnvFile } from "./commonUtils";
import { TemplateProject } from "../commonlib/constants";
import { Capability } from "../utils/constants";
import path from "path";

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
        console.log(
          `[Success] "${command}" in ${cwd} with some stderr: ${result.stderr}`
        );
      } else {
        console.log(`[Success] "${command}" in ${cwd}.`);
      }
      return { ...result, success: true };
    } catch (e: any) {
      if (e.killed && e.signal == "SIGTERM") {
        console.error(`[Failed] "${command}" in ${cwd}. Timeout and killed.`);
      } else {
        console.error(
          `[Failed] "${command}" in ${cwd} with error: ${e.message}`
        );
      }
      return { stdout: "", stderr: e.message as string, success: false };
    }
  }

  static login() {
    const command = `az login --service-principal -u ${process.env.AZURE_CLIENT_ID} -p ${process.env.AZURE_CLIENT_SECRET} -t ${process.env.AZURE_TENANT_ID}`;
    return this.execute(command, process.cwd());
  }

  static concatProcessEnv(
    processEnv: NodeJS.ProcessEnv,
    env: Record<string, string>
  ) {
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
      `teamsfx add spfx-web-part --spfx-webpart-name ${webpartName}` +
      ` --spfx-folder ${spfxFolder} --manifest-path ${manifestPath}` +
      ` --local-manifest-path ${localManifestPath}`;
    return this.execute(command, workspace);
  }

  static async upgrade(workspace: string) {
    const command = `teamsfx upgrade --force`;
    return this.execute(command, workspace);
  }

  static async executeCmd(
    workspace: string,
    cmd: string,
    env = "dev",
    processEnv?: NodeJS.ProcessEnv
  ) {
    const command = `teamsfx ${cmd} --env ${env}`;
    return this.execute(command, workspace, processEnv);
  }

  static async provision(workspace: string, env = "dev") {
    return this.executeCmd(workspace, "provision", env);
  }

  static async provisionWithCustomizedProcessEnv(
    workspace: string,
    processEnv: NodeJS.ProcessEnv,
    env = "dev"
  ) {
    return this.executeCmd(workspace, "provision", env, processEnv);
  }

  static async validate(workspace: string, env = "dev") {
    return this.executeCmd(workspace, "validate", env);
  }

  static async validateWithCustomizedProcessEnv(
    workspace: string,
    processEnv: NodeJS.ProcessEnv,
    env = "dev"
  ) {
    return this.executeCmd(workspace, "deploy", env, processEnv);
  }

  static async deploy(workspace: string, env = "dev") {
    return this.executeCmd(workspace, "deploy", env);
  }

  static async deployWithCustomizedProcessEnv(
    workspace: string,
    processEnv: NodeJS.ProcessEnv,
    env = "dev"
  ) {
    return this.executeCmd(workspace, "deploy", env, processEnv);
  }

  static async publish(workspace: string, env = "dev") {
    return this.executeCmd(workspace, "publish", env);
  }

  static async publishWithCustomizedProcessEnv(
    workspace: string,
    processEnv: NodeJS.ProcessEnv,
    env = "dev"
  ) {
    return this.executeCmd(workspace, "publish", env, processEnv);
  }

  static async preview(workspace: string, env = "dev") {
    return this.executeCmd(workspace, "prevew", env);
  }

  static async previewWithCustomizedProcessEnv(
    workspace: string,
    processEnv: NodeJS.ProcessEnv,
    env = "dev"
  ) {
    return this.executeCmd(workspace, "preview", env, processEnv);
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

  static async createTemplateProject(
    appName: string,
    testFolder: string,
    template: TemplateProject,
    processEnv?: NodeJS.ProcessEnv
  ) {
    const command = `teamsfx new template ${template} --interactive false `;
    const timeout = 100000;
    try {
      await this.execute(command, testFolder, processEnv, timeout);

      //  change original template name to appName
      await this.execute(
        `mv ./${template} ./${appName}`,
        testFolder,
        processEnv ? processEnv : process.env,
        timeout
      );

      const localEnvPath = path.resolve(
        testFolder,
        appName,
        "env",
        ".env.local"
      );
      const remoteEnvPath = path.resolve(
        testFolder,
        appName,
        "env",
        ".env.dev"
      );
      editDotEnvFile(localEnvPath, "TEAMS_APP_NAME", appName);
      editDotEnvFile(remoteEnvPath, "TEAMS_APP_NAME", appName);

      const message = `scaffold project to ${path.resolve(
        testFolder,
        appName
      )} with template ${template}`;
      console.log(message);
    } catch (e: any) {
      console.log(
        `Run \`${command}\` failed with error msg: ${JSON.stringify(e)}.`
      );
      if (e.killed && e.signal == "SIGTERM") {
        console.log(`Command ${command} killed due to timeout ${timeout}`);
      }
    }
  }

  static async openTemplateProject(
    appName: string,
    testFolder: string,
    template: TemplateProject,
    processEnv?: NodeJS.ProcessEnv
  ) {
    const timeout = 100000;
    const oldPath = path.resolve("./resource", template);
    const newPath = path.resolve(testFolder, appName);
    try {
      await this.execute(
        `mv ${oldPath} ${newPath}`,
        testFolder,
        processEnv,
        timeout
      );
    } catch (error) {
      console.log(error);
      throw new Error(`Failed to open project: ${newPath}`);
    }
    const localEnvPath = path.resolve(testFolder, appName, "env", ".env.local");
    const remoteEnvPath = path.resolve(testFolder, appName, "env", ".env.dev");
    editDotEnvFile(localEnvPath, "TEAMS_APP_NAME", appName);
    editDotEnvFile(remoteEnvPath, "TEAMS_APP_NAME", appName);
  }

  static async setSubscription(
    subscription: string,
    projectPath: string,
    processEnv?: NodeJS.ProcessEnv
  ) {
    const command = `teamsfx account set --subscription ${subscription}`;
    return this.execute(command, projectPath, processEnv);
  }

  static async package(workspace: string, env = "dev") {
    return this.executeCmd(workspace, "package", env);
  }
}
