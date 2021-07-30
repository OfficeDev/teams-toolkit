import { IProgressHandler, PluginContext } from "@microsoft/teamsfx-api";
import { Messages } from "../constants";

export const DeployArmTemplatesSteps = {
  DeployArmTemplates: Messages.ProgressDeployArmTemplates,
};

export class ProgressHelper {
  static deployArmTemplatesProgress: IProgressHandler | undefined;

  static async startDeployArmTemplatesProgressHandler(
    ctx: PluginContext
  ): Promise<IProgressHandler | undefined> {
    await this.deployArmTemplatesProgress?.end();

    this.deployArmTemplatesProgress = ctx.ui?.createProgressBar(
      Messages.DeployArmTemplatesProgressTitle,
      Object.entries(DeployArmTemplatesSteps).length
    );
    await this.deployArmTemplatesProgress?.start(Messages.ProgressStart);
    return this.deployArmTemplatesProgress;
  }

  static async endDeployArmTemplatesProgress(): Promise<void> {
    await this.deployArmTemplatesProgress?.end();
    this.deployArmTemplatesProgress = undefined;
  }
}
