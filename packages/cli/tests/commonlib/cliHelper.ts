import { execAsync, execAsyncWithRetry } from "../e2e/commonUtils";
import { ResourceToDeploy } from "./constants";
import path from "path";

export class CliHelper {
  static async setSubscription(subscription: string, projectPath: string) {
    const result = await execAsync(`teamsfx account set --subscription ${subscription}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    if (result.stderr) {
      console.error(
        `[Failed] set subscription for ${projectPath}. Error message: ${result.stderr}`
      );
    } else {
      console.log(`[Successfully] set subscription for ${projectPath}`);
    }
  }

  static async provisionProject(projectPath: string) {
    const result = await execAsyncWithRetry(`teamsfx provision`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    if (result.stderr) {
      console.error(`[Failed] provision ${projectPath}. Error message: ${result.stderr}`);
    } else {
      console.log(`[Successfully] provision ${projectPath}`);
    }
  }

  static async deployProject(resourceToDeploy: ResourceToDeploy, projectPath: string) {
    const result = await execAsyncWithRetry(`teamsfx deploy ${resourceToDeploy}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
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
    capability: string
  ) {
    const result = await execAsync(
      `teamsfx new --interactive false --app-name ${appName} --capabilities ${capability} `,
      {
        cwd: testFolder,
        env: process.env,
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

  static async addCapabilityToProject(projectPath: string, capabilityToAdd: string) {
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

  static async addResourceToProject(projectPath: string, resourceToAdd: string, options = "") {
    const result = await execAsync(`teamsfx resource add ${resourceToAdd} ${options}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    const message = ` add resource ${resourceToAdd} to ${projectPath}`;
    if (result.stderr) {
      console.error(`[Failed] ${message}. Error message: ${result.stderr}`);
    } else {
      console.log(`[Successfully] ${message}`);
    }
  }
}
