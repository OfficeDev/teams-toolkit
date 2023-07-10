// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  execAsync,
  execAsyncWithRetry,
  editDotEnvFile,
} from "../e2e/commonUtils";
import { TemplateProject, Resource, ResourceToDeploy } from "./constants";
import { Capability } from "../utils/constants";
import path from "path";

export class CliHelper {
  static async setSubscription(
    subscription: string,
    projectPath: string,
    processEnv?: NodeJS.ProcessEnv
  ) {
    const command = `teamsfx account set --subscription ${subscription}`;
    const timeout = 100000;
    try {
      const result = await execAsync(command, {
        cwd: projectPath,
        env: processEnv ? processEnv : process.env,
        timeout: timeout,
      });
      if (result.stderr) {
        console.error(
          `[Failed] set subscription for ${projectPath}. Error message: ${result.stderr}`
        );
      } else {
        console.log(`[Successfully] set subscription for ${projectPath}`);
      }
    } catch (e) {
      console.log(
        `Run \`${command}\` failed with error msg: ${JSON.stringify(e)}.`
      );
      if (e.killed && e.signal == "SIGTERM") {
        console.log(`Command ${command} killed due to timeout ${timeout}`);
      }
    }
  }

  static async addEnv(
    env: string,
    projectPath: string,
    processEnv?: NodeJS.ProcessEnv
  ) {
    const command = `teamsfx env add ${env} --env dev`;
    const timeout = 100000;

    try {
      const result = await execAsync(command, {
        cwd: projectPath,
        env: processEnv ? processEnv : process.env,
        timeout: timeout,
      });
      if (result.stderr) {
        console.error(
          `[Failed] add environment for ${projectPath}. Error message: ${result.stderr}`
        );
      } else {
        console.log(`[Successfully] add environment for ${projectPath}`);
      }
    } catch (e) {
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
    option = "",
    env: "dev" | "local" = "dev",
    processEnv?: NodeJS.ProcessEnv
  ) {
    const result = await execAsyncWithRetry(
      `teamsfx provision --env ${env} --interactive false --verbose ${option}`,
      {
        cwd: projectPath,
        env: processEnv ? processEnv : process.env,
        timeout: 0,
      }
    );

    if (result.stderr) {
      console.error(
        `[Failed] provision ${projectPath}. Error message: ${result.stderr}`
      );
    } else {
      console.log(`[Successfully] provision ${projectPath}`);
    }
  }

  static async addApiConnection(
    projectPath: string,
    commonInputs: string,
    authType: string,
    options = ""
  ) {
    const result = await execAsyncWithRetry(
      `teamsfx add api-connection ${authType} ${commonInputs} ${options} --interactive false`,
      {
        cwd: projectPath,
        timeout: 0,
      }
    );

    if (result.stderr) {
      console.error(
        `[Failed] addApiConnection for ${projectPath}. Error message: ${result.stderr}`
      );
    } else {
      console.log(`[Successfully] addApiConnection for ${projectPath}`);
    }
  }

  static async addCICDWorkflows(
    projectPath: string,
    option = "",
    processEnv?: NodeJS.ProcessEnv
  ) {
    const result = await execAsyncWithRetry(`teamsfx add cicd ${option}`, {
      cwd: projectPath,
      env: processEnv ? processEnv : process.env,
      timeout: 0,
    });

    if (result.stderr) {
      console.error(
        `[Failed] addCICDWorkflows for ${projectPath}. Error message: ${result.stderr}`
      );
    } else {
      console.log(`[Successfully] addCICDWorkflows for ${projectPath}`);
    }
  }

  static async addExistingApi(projectPath: string, option = "") {
    const result = await execAsyncWithRetry(
      `teamsfx add api-connection ${option}`,
      {
        cwd: projectPath,
        timeout: 0,
      }
    );
    if (result.stderr) {
      console.error(
        `[Failed] addExistingApi for ${projectPath}. Error message: ${result.stderr}`
      );
    } else {
      console.log(`[Successfully] addExistingApi for ${projectPath}`);
    }
  }

  static async updateAadManifest(
    projectPath: string,
    option = "",
    processEnv?: NodeJS.ProcessEnv,
    retries?: number,
    newCommand?: string
  ) {
    const result = await execAsyncWithRetry(
      `teamsfx update aad-app ${option} --interactive false`,
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
      console.error(`[Failed] ${message}. Error message: ${result.stderr}`);
    } else {
      console.log(`[Successfully] ${message}`);
    }
  }

  static async deployAll(
    projectPath: string,
    option = "",
    env: "dev" | "local" = "dev",
    processEnv?: NodeJS.ProcessEnv,
    retries?: number,
    newCommand?: string
  ) {
    const result = await execAsyncWithRetry(
      `teamsfx deploy --env ${env} --interactive false --verbose ${option}`,
      {
        cwd: projectPath,
        env: processEnv ? processEnv : process.env,
        timeout: 0,
      },
      retries,
      newCommand
    );
    const message = `deploy all resources for ${projectPath}`;
    if (result.stderr) {
      console.error(`[Failed] ${message}. Error message: ${result.stderr}`);
    } else {
      console.log(`[Successfully] ${message}`);
    }
  }

  static async deployProject(
    resourceToDeploy: ResourceToDeploy,
    projectPath: string,
    option = "",
    processEnv?: NodeJS.ProcessEnv,
    retries?: number,
    newCommand?: string
  ) {
    const result = await execAsyncWithRetry(
      `teamsfx deploy ${resourceToDeploy} ${option}`,
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
      console.error(`[Failed] ${message}. Error message: ${result.stderr}`);
    } else {
      console.log(`[Successfully] ${message}`);
    }
  }

  static async createDotNetProject(
    appName: string,
    testFolder: string,
    capability: Capability,
    processEnv?: NodeJS.ProcessEnv,
    options = ""
  ): Promise<void> {
    const command = `teamsfx new --interactive false --runtime dotnet --app-name ${appName} --capabilities ${capability} ${options}`;
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
        console.error(`[Failed] ${message}. Error message: ${result.stderr}`);
      } else {
        console.log(`[Successfully] ${message}`);
      }
    } catch (e) {
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
    processEnv?: NodeJS.ProcessEnv,
    options = ""
  ) {
    const command = `teamsfx new --interactive false --app-name ${appName} --capabilities ${capability} ${options}`;
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
        console.error(`[Failed] ${message}. Error message: ${result.stderr}`);
      } else {
        console.log(`[Successfully] ${message}`);
      }
    } catch (e) {
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
      await execAsync(`mv ${oldPath} ${newPath}`, {
        env: processEnv ? processEnv : process.env,
        timeout: timeout,
      });
    } catch (error) {
      console.log(error);
      throw new Error(`Failed to open project: ${newPath}`);
    }
    const localEnvPath = path.resolve(testFolder, appName, "env", ".env.local");
    const remoteEnvPath = path.resolve(testFolder, appName, "env", ".env.dev");
    editDotEnvFile(localEnvPath, "TEAMS_APP_NAME", appName);
    editDotEnvFile(remoteEnvPath, "TEAMS_APP_NAME", appName);
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
      const result = await execAsync(command, {
        cwd: testFolder,
        env: processEnv ? processEnv : process.env,
        timeout: timeout,
      });

      //  change original template name to appName
      await execAsync(`mv ./${template} ./${appName}`, {
        cwd: testFolder,
        env: processEnv ? processEnv : process.env,
        timeout: timeout,
      });

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
      if (result.stderr) {
        console.error(`[Failed] ${message}. Error message: ${result.stderr}`);
      } else {
        console.log(`[Successfully] ${message}`);
      }
    } catch (e) {
      console.log(
        `Run \`${command}\` failed with error msg: ${JSON.stringify(e)}.`
      );
      if (e.killed && e.signal == "SIGTERM") {
        console.log(`Command ${command} killed due to timeout ${timeout}`);
      }
    }
  }

  static async addCapabilityToProject(
    projectPath: string,
    capabilityToAdd: Capability
  ) {
    const command = `teamsfx add ${capabilityToAdd}`;
    const timeout = 100000;
    try {
      const result = await execAsync(command, {
        cwd: projectPath,
        env: process.env,
        timeout: timeout,
      });
      const message = `add capability ${capabilityToAdd} to ${projectPath}`;
      if (result.stderr) {
        console.error(`[Failed] ${message}. Error message: ${result.stderr}`);
      } else {
        console.log(`[Successfully] ${message}`);
      }
    } catch (e) {
      console.log(
        `Run \`${command}\` failed with error msg: ${JSON.stringify(e)}.`
      );
      if (e.killed && e.signal == "SIGTERM") {
        console.log(`Command ${command} killed due to timeout ${timeout}`);
      }
    }
  }

  static async addResourceToProject(
    projectPath: string,
    resourceToAdd: Resource,
    options = "",
    processEnv?: NodeJS.ProcessEnv
  ) {
    const command = `teamsfx add ${resourceToAdd} ${options}`;
    const timeout = 100000;
    try {
      const result = await execAsync(command, {
        cwd: projectPath,
        env: processEnv ? processEnv : process.env,
        timeout: timeout,
      });
      const message = `add resource ${resourceToAdd} to ${projectPath}`;
      if (result.stderr) {
        console.error(`[Failed] ${message}. Error message: ${result.stderr}`);
      } else {
        console.log(`[Successfully] ${message}`);
      }
    } catch (e) {
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
    let value = "";
    const command = `teamsfx config get ${key} --env ${env}`;
    const timeout = 100000;
    try {
      const result = await execAsync(command, {
        cwd: projectPath,
        env: process.env,
        timeout: timeout,
      });

      const message = `get user settings in ${projectPath}. Key: ${key}`;
      if (result.stderr) {
        console.error(`[Failed] ${message}. Error message: ${result.stderr}`);
      } else {
        const arr = (result.stdout as string).split(":");
        if (!arr || arr.length <= 1) {
          console.error(
            `[Failed] ${message}. Failed to get value from cli result. result: ${result.stdout}`
          );
        } else {
          value = arr[1].trim() as string;
          console.log(`[Successfully] ${message}.`);
        }
      }
    } catch (e) {
      console.log(
        `Run \`${command}\` failed with error msg: ${JSON.stringify(e)}.`
      );
      if (e.killed && e.signal == "SIGTERM") {
        console.log(`Command ${command} killed due to timeout ${timeout}`);
      }
    }
    return value;
  }
}
