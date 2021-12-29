import { execAsync, execAsyncWithRetry } from "../e2e/commonUtils";
import { ResourceToDeploy } from "./constants";
import path from "path";

export class CliHelper {
  static async setSubscription(subscription: string, projectPath: string) {
    await execAsync(`teamsfx account set --subscription ${subscription}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] set subscription for ${projectPath}`);
  }

  static async provisionProject(projectPath: string) {
    // provision
    await execAsyncWithRetry(`teamsfx provision`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] provision for ${projectPath}`);
  }

  static async deployProject(resourceToDeploy: ResourceToDeploy, projectPath: string) {
    // deploy
    await execAsyncWithRetry(`teamsfx deploy ${resourceToDeploy}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] deploy ${resourceToDeploy} for ${projectPath}`);
  }

  static async createProjectWithCapability(
    appName: string,
    testFolder: string,
    capability: string
  ) {
    await execAsync(
      `teamsfx new --interactive false --app-name ${appName} --capabilities ${capability} `,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0,
      }
    );
    console.log(
      `[Successfully] scaffold project to ${path.resolve(
        testFolder,
        appName
      )} with capability ${capability}`
    );
  }

  static async addCapabilityToProject(projectPath: string, capabilityToAdd: string) {
    await execAsync(`teamsfx capability add ${capabilityToAdd}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] add capability ${capabilityToAdd} to ${projectPath}`);
  }

  static async addResourceToProject(projectPath: string, resourceToAdd: string) {
    await execAsync(`teamsfx resource add ${resourceToAdd}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] add resource ${resourceToAdd} to ${projectPath}`);
  }
}
