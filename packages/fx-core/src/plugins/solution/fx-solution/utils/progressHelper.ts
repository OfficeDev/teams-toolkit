import { IProgressHandler, PluginContext } from "@microsoft/teamsfx-api";
import { getStrings } from "../../../../common";

export enum DeployArmTemplatesSteps {
  ExecuteDeployment = "Deploying solution Arm templates to Azure. This could take several minutes.",
}
export class ProgressHelper {
  static deployArmTemplatesProgress: IProgressHandler | undefined;

  static async startDeployArmTemplatesProgressHandler(
    ctx: PluginContext
  ): Promise<IProgressHandler | undefined> {
    await this.deployArmTemplatesProgress?.end();

    this.deployArmTemplatesProgress = ctx.ui?.createProgressBar(
      getStrings().solution.DeployArmTemplates.Progress.Title,
      Object.entries(DeployArmTemplatesSteps).length
    );
    await this.deployArmTemplatesProgress?.start(
      getStrings().solution.DeployArmTemplates.Progress.Start
    );
    return this.deployArmTemplatesProgress;
  }

  static async endDeployArmTemplatesProgress(): Promise<void> {
    await this.deployArmTemplatesProgress?.end();
    this.deployArmTemplatesProgress = undefined;
  }
}
