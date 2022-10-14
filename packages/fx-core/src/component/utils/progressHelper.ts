import { IProgressHandler, UserInteraction } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../common/localizeUtils";

export class ProgressHelper {
  static deployArmTemplatesProgress: IProgressHandler | undefined;

  static async startDeployArmTemplatesProgressHandler(
    ui?: UserInteraction
  ): Promise<IProgressHandler | undefined> {
    await this.deployArmTemplatesProgress?.end(true);

    this.deployArmTemplatesProgress = ui?.createProgressBar(
      getLocalizedString("core.deployArmTemplates.Progress.Title"),
      1
    );
    await this.deployArmTemplatesProgress?.start(
      getLocalizedString("core.deployArmTemplates.Progress.Start")
    );
    return this.deployArmTemplatesProgress;
  }

  static async endDeployArmTemplatesProgress(success: boolean): Promise<void> {
    await this.deployArmTemplatesProgress?.end(success);
    this.deployArmTemplatesProgress = undefined;
  }
}
