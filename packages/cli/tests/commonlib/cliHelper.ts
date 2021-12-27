import { execAsync, execAsyncWithRetry } from "../e2e/commonUtils";
import { ResourceToDeploy } from "./constants";

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
}
