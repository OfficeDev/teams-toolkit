// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BuildArgs } from "../../../../component/driver/interface/buildAndDeployArgs";
import { InstallToolArgs } from "../../../../component/driver/devTool/interfaces/InstallToolArgs";
import { BaseAppYmlGenerator } from "../appYmlGenerator";
import { DebugPlaceholderMapping, OldProjectSettingsHelper } from "./debugV3MigrationUtils";

export class AppLocalYmlConfig {
  provision: {
    registerApp?: {
      aad?: boolean;
      teamsApp?: boolean;
    };
    bot?: {
      messagingEndpoint: string;
      isM365?: boolean;
    };
    configureApp?: {
      tab?: {
        domain?: string;
        endpoint?: string;
      };
      aad?: boolean;
      teamsApp?: {
        appPackagePath?: string;
      };
      isM365?: boolean;
    };
  } = {};
  deploy?: {
    tools?: InstallToolArgs;
    npmCommands?: BuildArgs[];
    dotnetCommand?: BuildArgs;
    tab?: {
      port?: number;
    };
    bot?: boolean;
    sso?: boolean;
    ssoTab?: {
      functionName?: string;
    };
    ssoBot?: boolean;
    ssoFunction?: boolean;
    frontendStart?: {
      sso?: boolean;
      functionName?: string;
    };
    authStart?: {
      appsettingsPath: string;
    };
    botStart?: {
      tab?: boolean;
      function?: boolean;
      sso?: boolean;
    };
    backendStart?: boolean;
  };
}

export class AppLocalYmlGenerator extends BaseAppYmlGenerator {
  protected handlebarsContext: {
    config: AppLocalYmlConfig;
    placeholderMappings: DebugPlaceholderMapping;
  };

  constructor(
    oldProjectSettings: any,
    config: AppLocalYmlConfig,
    placeholderMappings: DebugPlaceholderMapping
  ) {
    super(oldProjectSettings);
    this.handlebarsContext = {
      config: config,
      placeholderMappings: placeholderMappings,
    };
  }

  public async generateAppYml(): Promise<string> {
    await this.generateHandlerbarsContext();

    switch (this.oldProjectSettings.programmingLanguage?.toLowerCase()) {
      case "javascript":
      case "typescript":
      default:
        // only support js/ts at first
        return await this.buildHandlebarsTemplate("js.ts.app.local.yml");
    }
  }

  private generateHandlerbarsContext(): Promise<void> {
    let functionName: string | undefined = undefined;
    if (OldProjectSettingsHelper.includeFunction(this.oldProjectSettings)) {
      functionName =
        OldProjectSettingsHelper.getFunctionName(this.oldProjectSettings) || "getUserProfile";
    }

    if (this.handlebarsContext.config.provision?.configureApp) {
      this.handlebarsContext.config.provision.configureApp.isM365 = this.oldProjectSettings.isM365;
    }

    if (this.handlebarsContext.config.provision?.bot) {
      this.handlebarsContext.config.provision.bot.isM365 = this.oldProjectSettings.isM365;
    }

    if (this.handlebarsContext.config.deploy?.sso) {
      if (OldProjectSettingsHelper.includeTab(this.oldProjectSettings)) {
        this.handlebarsContext.config.deploy.ssoTab = {
          functionName,
        };
      }

      if (OldProjectSettingsHelper.includeBot(this.oldProjectSettings)) {
        this.handlebarsContext.config.deploy.ssoBot = true;
      }

      if (functionName) {
        this.handlebarsContext.config.deploy.ssoFunction = true;
      }
    }
    return Promise.resolve();
  }
}
