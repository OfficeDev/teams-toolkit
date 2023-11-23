// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  execAsync,
  execAsyncWithRetry,
  timeoutPromise,
  killPort,
  spawnCommand,
  killNgrok,
} from "../utils/commonUtils";
import {
  TemplateProjectFolder,
  Resource,
  ResourceToDeploy,
  Capability,
} from "../utils/constants";
import { isV3Enabled } from "@microsoft/teamsfx-core";
import path from "path";
import * as chai from "chai";
import { Executor } from "../utils/executor";
import * as os from "os";

export class CliHelper {
  static async addEnv(
    env: string,
    projectPath: string,
    processEnv?: NodeJS.ProcessEnv
  ) {
    const command = `teamsapp env add ${env} --env dev`;
    const timeout = 100000;

    try {
      const result = await execAsync(command, {
        cwd: projectPath,
        env: processEnv ? processEnv : process.env,
        timeout: timeout,
      });
      if (result.stderr) {
        console.log(
          `[Failed] add environment for ${projectPath}. Error message: ${result.stderr}`
        );
      } else {
        console.log(`[Successfully] add environment for ${projectPath}`);
      }
    } catch (e: any) {
      console.log(
        `Run \`${command}\` failed with error msg: ${JSON.stringify(e)}.`
      );
      if (e.killed && e.signal == "SIGTERM") {
        console.log(`Command ${command} killed due to timeout ${timeout}`);
      }
    }
  }

  static async provisionProject(
    projectPath: string,
    env: "local" | "dev" = "local",
    v3 = true,
    processEnv?: NodeJS.ProcessEnv
  ) {
    if (!isV3Enabled() && env === "local") {
      chai.assert.fail("local env is not supported in v2");
    }
    console.log(`[Provision] ${projectPath}`);
    const timeout = timeoutPromise(1000 * 60 * 10);
    let command = "";
    if (v3) {
      command = `npx teamsapp -v`;
    } else {
      command = `npx teamsfx -v`;
    }
    const version = await execAsyncWithRetry(command, {
      cwd: projectPath,
      env: processEnv ? processEnv : process.env,
    });
    console.log(`[Provision] cli version: ${version.stdout}`);

    if (v3) {
      const childProcess = spawnCommand(
        os.type() === "Windows_NT" ? "npx.cmd" : "npx",
        ["teamsapp", "provision", "--env", env, "--verbose"],
        {
          cwd: projectPath,
          env: processEnv ? processEnv : process.env,
        }
      );
      await Promise.all([timeout, childProcess]);
      // close process
      childProcess.kill("SIGKILL");
    } else {
      const childProcess = spawnCommand(
        os.type() === "Windows_NT" ? "npx.cmd" : "npx",
        [
          "teamsfx",
          "provision",
          "--env",
          env,
          "--resource-group",
          processEnv?.AZURE_RESOURCE_GROUP_NAME
            ? processEnv.AZURE_RESOURCE_GROUP_NAME
            : "",
          "--verbose",
          "--interactive",
          "false",
        ],
        {
          cwd: projectPath,
          env: processEnv ? processEnv : process.env,
        }
      );
      await Promise.all([timeout, childProcess]);
      // close process
      childProcess.kill("SIGKILL");
    }
  }

  static async publishProject(
    projectPath: string,
    env: "local" | "dev" = "local",
    option = "",
    processEnv?: NodeJS.ProcessEnv
  ) {
    console.log(`[publish] ${projectPath}`);
    const result = await execAsyncWithRetry(
      `teamsapp publish --env ${env} --verbose  ${option}`,
      {
        cwd: projectPath,
        env: processEnv ? processEnv : process.env,
        timeout: 0,
      }
    );

    if (result.stderr) {
      console.log(
        `[Failed] publish ${projectPath}. Error message: ${result.stderr}`
      );
    } else {
      console.log(`[Successfully] publish ${projectPath}`);
    }
  }

  static async addFeature(feature: string, cwd: string) {
    console.log(`[start] add feature ${feature}... `);
    const { success } = await Executor.execute(
      `teamsfx add ${feature} --verbose --interactive false`,
      cwd
    );
    chai.expect(success).to.be.true;
    const message = `[success] add ${feature} successfully !!!`;
    console.log(message);
  }

  static async updateAadManifest(
    projectPath: string,
    option = "",
    processEnv?: NodeJS.ProcessEnv,
    retries?: number,
    newCommand?: string
  ) {
    const result = await execAsyncWithRetry(
      `tamsapp entra-app update ${option} --interactive false`,
      {
        cwd: projectPath,
        env: processEnv ? processEnv : process.env,
        timeout: 0,
      },
      retries,
      newCommand
    );
    const message = `update aad-app manifest template for ${projectPath}`;
    if (result.stderr) {
      console.log(`[Failed] ${message}. Error message: ${result.stderr}`);
    } else {
      console.log(`[Successfully] ${message}`);
    }
  }

  static async deploy(
    projectPath: string,
    env: "local" | "dev" = "local",
    option = "",
    processEnv?: NodeJS.ProcessEnv,
    retries?: number,
    newCommand?: string
  ) {
    if (!isV3Enabled() && env === "local") {
      chai.assert.fail(`[error] provision local only support in V3 project`);
    }
    console.log(`[Deploy] ${projectPath}`);
    const timeout = timeoutPromise(1000 * 60 * 10);

    const childProcess = spawnCommand(
      os.type() === "Windows_NT" ? "npx.cmd" : "npx",
      [
        "teamsfx",
        "deploy",
        "--env",
        env,
        "--verbose",
        "--interactive",
        "false",
      ],
      {
        cwd: projectPath,
        env: processEnv ? processEnv : process.env,
      }
    );
    await Promise.all([timeout, childProcess]);
    // close process
    childProcess.kill("SIGKILL");
  }

  static async deployProject(
    resourceToDeploy: ResourceToDeploy,
    projectPath: string,
    option = "",
    processEnv?: NodeJS.ProcessEnv,
    retries?: number,
    newCommand?: string
  ) {
    if (isV3Enabled()) {
      console.log("add command is not supported in v3");
    } else {
      const result = await execAsyncWithRetry(
        `teamsapp deploy ${resourceToDeploy} ${option}`,
        {
          cwd: projectPath,
          env: processEnv ? processEnv : process.env,
          timeout: 0,
        },
        retries,
        newCommand
      );
      const message = `deploy ${resourceToDeploy} for ${projectPath}`;
      if (result.stderr) {
        console.log(`[Failed] ${message}. Error message: ${result.stderr}`);
      } else {
        console.log(`[Successfully] ${message}`);
      }
    }
  }

  static async createDotNetProject(
    appName: string,
    testFolder: string,
    capability: "tab" | "bot",
    processEnv?: NodeJS.ProcessEnv,
    options = ""
  ): Promise<void> {
    const command = `teamsapp new --interactive false --runtime dotnet --app-name ${appName} --capability ${capability} ${options}`;
    const timeout = 100000;
    try {
      const result = await execAsync(command, {
        cwd: testFolder,
        env: processEnv ? processEnv : process.env,
        timeout: timeout,
      });
      const message = `scaffold project to ${path.resolve(
        testFolder,
        appName
      )} with capability ${capability}`;
      if (result.stderr) {
        console.log(`[Failed] ${message}. Error message: ${result.stderr}`);
      } else {
        console.log(`[Successfully] ${message}`);
      }
    } catch (e: any) {
      console.log(
        `Run \`${command}\` failed with error msg: ${JSON.stringify(e)}.`
      );
      if (e.killed && e.signal == "SIGTERM") {
        console.log(`Command ${command} killed due to timeout ${timeout}`);
      }
    }
  }

  static async createProjectWithCapability(
    appName: string,
    testFolder: string,
    capability: Capability,
    lang: "javascript" | "typescript" = "javascript",
    options = "",
    processEnv?: NodeJS.ProcessEnv
  ) {
    console.log("isV3Enabled: " + isV3Enabled());
    const command = `teamsapp new --interactive false --app-name ${appName} --capability ${capability} --programming-language ${lang} ${options}`;
    const timeout = 100000;
    try {
      await Executor.execute("teamsapp -v", testFolder);
      await Executor.execute(command, testFolder);
      const message = `scaffold project to ${path.resolve(
        testFolder,
        appName
      )} with capability ${capability}`;
      console.log(`[Successfully] ${message}`);
    } catch (e: any) {
      console.log(
        `Run \`${command}\` failed with error msg: ${JSON.stringify(e)}.`
      );
      if (e.killed && e.signal == "SIGTERM") {
        console.log(`Command ${command} killed due to timeout ${timeout}`);
      }
    }
  }

  static async createProjectWithCapabilityMigration(
    appName: string,
    testFolder: string,
    capability: Capability,
    lang: "javascript" | "typescript" = "javascript",
    options = "",
    processEnv?: NodeJS.ProcessEnv
  ) {
    console.log("isV3Enabled: " + isV3Enabled());
    let command;
    if (isV3Enabled()) {
      command = `teamsapp new --interactive false --app-name ${appName} --capability ${capability} --programming-language ${lang} ${options}`;
    } else {
      command = `teamsfx new --interactive false --app-name ${appName} --capabilities ${capability} --programming-language ${lang} ${options}`;
    }
    const timeout = 100000;
    try {
      if (isV3Enabled()) {
        const { stdout } = await Executor.execute("teamsapp -v", testFolder);
        console.log(stdout);
      } else {
        const { stdout } = await Executor.execute("teamsfx -v", testFolder);
        console.log(stdout);
      }
      await Executor.execute(command, testFolder);
      const message = `scaffold project to ${path.resolve(
        testFolder,
        appName
      )} with capability ${capability}`;
      console.log(`[Successfully] ${message}`);
    } catch (e: any) {
      console.log(
        `Run \`${command}\` failed with error msg: ${JSON.stringify(e)}.`
      );
      if (e.killed && e.signal == "SIGTERM") {
        console.log(`Command ${command} killed due to timeout ${timeout}`);
      }
    }
  }

  static async createTemplateProject(
    testFolder: string,
    template: TemplateProjectFolder,
    V3: boolean,
    processEnv?: NodeJS.ProcessEnv
  ) {
    process.env["TEAMSFX_V3"] = V3 ? "true" : "false";
    process.env["TEAMSFX_V3_MIGRATION"] = V3 ? "true" : "false";

    console.log("TEAMSFX_V3: " + process.env["TEAMSFX_V3"]);
    console.log(await Executor.execute("teamsapp -v", testFolder));

    const command = `teamsapp new sample ${template} --interactive false `;
    const timeout = 100000;
    try {
      const result = await Executor.execute(command, testFolder);

      const message = `scaffold project to ${path.resolve(
        template
      )} with template ${template}`;
      if (result.stderr) {
        console.log(`[Failed] ${message}. Error message: ${result.stderr}`);
      } else {
        console.log(`[Successfully] ${message}`);
      }
    } catch (e: any) {
      console.log(
        `Run \`${command}\` failed with error msg: ${JSON.stringify(e)}.`
      );
      if (e.killed && e.signal == "SIGTERM") {
        console.log(`Command ${command} killed due to timeout ${timeout}`);
      }
    }
  }

  static async getUserSettings(
    key: string,
    projectPath: string,
    env: string
  ): Promise<string> {
    const value = "";
    // const command = `teamsfx config get ${key} --env ${env}`;
    // const timeout = 100000;
    // try {
    //   const result = await execAsync(command, {
    //     cwd: projectPath,
    //     env: process.env,
    //     timeout: timeout,
    //   });

    //   const message = `get user settings in ${projectPath}. Key: ${key}`;
    //   if (result.stderr) {
    //     console.log(`[Failed] ${message}. Error message: ${result.stderr}`);
    //   } else {
    //     const arr = (result.stdout as string).split(":");
    //     if (!arr || arr.length <= 1) {
    //       console.log(
    //         `[Failed] ${message}. Failed to get value from cli result. result: ${result.stdout}`
    //       );
    //     } else {
    //       value = arr[1].trim() as string;
    //       console.log(`[Successfully] ${message}.`);
    //     }
    //   }
    // } catch (e: any) {
    //   console.log(
    //     `Run \`${command}\` failed with error msg: ${JSON.stringify(e)}.`
    //   );
    //   if (e.killed && e.signal == "SIGTERM") {
    //     console.log(`Command ${command} killed due to timeout ${timeout}`);
    //   }
    // }
    return value;
  }

  static async installCLI(version: string, global: boolean, cwd = "./") {
    console.log(`install CLI with version ${version}`);
    if (global) {
      const { success } = await Executor.execute(
        `npm install -g @microsoft/teamsapp-cli@${version}`,
        cwd
      );
      chai.expect(success).to.be.true;
    } else {
      const { success } = await Executor.execute(
        `npm install @microsoft/teamsapp-cli@${version}`,
        cwd
      );
      chai.expect(success).to.be.true;
    }
    console.log("install CLI successfully");
  }

  static setV3Enable() {
    process.env["TEAMSFX_V3"] = "true";
  }

  static setV2Enable() {
    process.env["TEAMSFX_V3"] = "false";
  }

  static async debugProject(
    projectPath: string,
    env: "local" | "dev",
    option = "",
    processEnv?: NodeJS.ProcessEnv,
    retries?: number,
    newCommand?: string
  ) {
    console.log(`[start] ${env} debug ... `);
    const timeout = timeoutPromise(1000 * 60 * 10);
    const childProcess = spawnCommand(
      os.type() === "Windows_NT" ? "teamsfx.cmd" : "teamsfx",
      ["preview", `--${env}`],
      {
        cwd: projectPath,
        env: processEnv ? processEnv : process.env,
      }
    );
    await Promise.all([timeout, childProcess]);
    try {
      // close process & port
      childProcess.kill("SIGKILL");
    } catch (error) {
      console.log(`kill process failed`);
    }
    try {
      await killPort(53000);
      console.log(`close port 53000 successfully`);
    } catch (error) {
      console.log(`close port 53000 failed`);
    }
    try {
      await killPort(7071);
      console.log(`close port 7071 successfully`);
    } catch (error) {
      console.log(`close port 7071 failed`);
    }
    try {
      await killPort(9229);
      console.log(`close port 9229 successfully`);
    } catch (error) {
      console.log(`close port 9229 failed`);
    }
    try {
      await killPort(3978);
      console.log(`close port 3978 successfully`);
    } catch (error) {
      console.log(`close port 3978 failed`);
    }
    try {
      await killPort(9239);
      console.log(`close port 9239 successfully`);
    } catch (error) {
      console.log(`close port 9239 failed`);
    }
    try {
      await killNgrok();
      console.log(`close Ngrok successfully`);
    } catch (error) {
      console.log(`close Ngrok failed`);
    }
    console.log("[success] debug successfully !!!");
  }
}
