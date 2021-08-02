// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext, IProgressHandler } from "@microsoft/teamsfx-api";

export class DialogUtils {
  static progressBar: IProgressHandler | undefined;
  static ctx: PluginContext;

  public static init(ctx: PluginContext, progressTitle?: string, processStep?: number) {
    DialogUtils.ctx = ctx;
    if (progressTitle && processStep) {
      DialogUtils.progressBar = ctx.ui?.createProgressBar(progressTitle, processStep);
    }
  }
}

export class ProgressTitle {
  static readonly Provision = "Provisioning SQL";
  static readonly PostProvision = "Configuring SQL";
}

export class ProvisionMessage {
  static readonly checkProvider = "Check SQL resource provider";
  static readonly provisionSQL = "Provision SQL server";
  static readonly provisionDatabase = "Provision database";
}

export class ConfigureMessage {
  static readonly postProvisionAddAadmin = "Configure aad admin for SQL";
  static readonly postProvisionAddUser = "Configure database user";
}
