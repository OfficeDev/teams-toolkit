// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { IProgressHandler, UserInteraction } from "@microsoft/teamsfx-api";

export class DialogUtils {
  static progressBar: IProgressHandler | undefined;

  public static init(ui?: UserInteraction, progressTitle?: string, processStep?: number) {
    if (progressTitle && processStep) {
      DialogUtils.progressBar = ui?.createProgressBar(progressTitle, processStep);
    }
  }
}

export class ProgressTitle {
  static readonly Provision = "Provisioning SQL";
  static readonly PostProvision = "Configuring SQL";
}

export class ConfigureMessage {
  static readonly postProvisionAddAadmin = "Configure aad admin for SQL";
  static readonly postProvisionAddUser = "Configure database user";
}
