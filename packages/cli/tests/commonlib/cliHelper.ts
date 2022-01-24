import { execAsync, execAsyncWithRetry } from "../e2e/commonUtils";
import { Capability, Resource, ResourceToDeploy } from "./constants";
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
      console.log(`Run \`${command}\` failed with error msg: ${JSON.stringify(e)}.`);
      if (e.killed && e.signal == "SIGTERM") {
        console.log(`Command ${command} killed due to timeout ${timeout}`);
      }
    }
  }

  static async addEnv(env: string, projectPath: string, processEnv?: NodeJS.ProcessEnv) {
    const result = await execAsync(`teamsfx env add ${env} --env dev`, {
      cwd: projectPath,
      env: processEnv ? processEnv : process.env,
      timeout: 0,
    });
    if (result.stderr) {
      console.error(`[Failed] add environment for ${projectPath}. Error message: ${result.stderr}`);
    } else {
      console.log(`[Successfully] add environment for ${projectPath}`);
    }
  }

  static async provisionProject(projectPath: string, option = "", processEnv?: NodeJS.ProcessEnv) {
    const result = await execAsyncWithRetry(`teamsfx provision ${option}`, {
      cwd: projectPath,
      env: processEnv ? processEnv : process.env,
      timeout: 10,
    });

    if (result.stderr) {
      console.error(`[Failed] provision ${projectPath}. Error message: ${result.stderr}`);
    } else {
      console.log(`[Successfully] provision ${projectPath}`);
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

  static async createProjectWithCapability(
    appName: string,
    testFolder: string,
    capability: Capability,
    processEnv?: NodeJS.ProcessEnv,
    options = ""
  ) {
    const result = await execAsync(
      `teamsfx new --interactive false --app-name ${appName} --capabilities ${capability} ${options}`,
      {
        cwd: testFolder,
        env: processEnv ? processEnv : process.env,
        timeout: 0,
      }
    );
    const message = `scaffold project to ${path.resolve(
      testFolder,
      appName
    )} with capability ${capability}`;
    if (result.stderr) {
      console.error(`[Failed] ${message}. Error message: ${result.stderr}`);
    } else {
      console.log(`[Successfully] ${message}`);
    }
  }

  static async addCapabilityToProject(projectPath: string, capabilityToAdd: Capability) {
    const result = await execAsync(`teamsfx capability add ${capabilityToAdd}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    const message = `add capability ${capabilityToAdd} to ${projectPath}`;
    if (result.stderr) {
      console.error(`[Failed] ${message}. Error message: ${result.stderr}`);
    } else {
      console.log(`[Successfully] ${message}`);
    }
  }

  static async addResourceToProject(
    projectPath: string,
    resourceToAdd: Resource,
    options = "",
    processEnv?: NodeJS.ProcessEnv
  ) {
    const result = await execAsync(`teamsfx resource add ${resourceToAdd} ${options}`, {
      cwd: projectPath,
      env: processEnv ? processEnv : process.env,
      timeout: 0,
    });
    const message = `add resource ${resourceToAdd} to ${projectPath}`;
    if (result.stderr) {
      console.error(`[Failed] ${message}. Error message: ${result.stderr}`);
    } else {
      console.log(`[Successfully] ${message}`);
    }
  }

  static async getUserSettings(key: string, projectPath: string, env: string): Promise<string> {
    let value = "";
    const result = await execAsync(`teamsfx config get ${key} --env ${env}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
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
    return value;
  }
}
