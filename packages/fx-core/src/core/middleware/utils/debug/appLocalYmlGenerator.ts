// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureSolutionSettings, ProjectSettings } from "@microsoft/teamsfx-api";
import { BuildArgs } from "../../../../component/driver/interface/buildAndDeployArgs";
import { InstallToolArgs } from "../../../../component/driver/prerequisite/interfaces/InstallToolArgs";
import { BaseAppYmlGenerator } from "../appYmlGenerator";

export class AppLocalYmlConfig {
  registerApp?: {
    aad?: boolean;
    teamsApp?: boolean;
  };
  provision?: {
    bot?: boolean;
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
  };
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
  };
}

export class AppLocalYmlGenerator extends BaseAppYmlGenerator {
  protected handlebarsContext: {
    config: AppLocalYmlConfig;
  };

  constructor(oldProjectSettings: ProjectSettings, config: AppLocalYmlConfig) {
    super(oldProjectSettings);
    this.handlebarsContext = {
      config: config,
    };
  }

  public async generateAppYml(): Promise<string> {
    this.generateHandlerbarsContext();

    switch (this.oldProjectSettings.programmingLanguage?.toLowerCase()) {
      case "javascript":
      case "typescript":
      default:
        // only support js/ts at first
        return await this.buildHandlebarsTemplate("js.ts.app.local.yml");
    }
  }

  private async generateHandlerbarsContext(): Promise<void> {
    const azureSolutionSettings = this.oldProjectSettings.solutionSettings as AzureSolutionSettings;

    let functionName: string | undefined = undefined;
    if (azureSolutionSettings.activeResourcePlugins.includes("fx-resource-function")) {
      functionName = this.oldProjectSettings.defaultFunctionName || "getUserProfile";
    }

    if (this.handlebarsContext.config.deploy?.sso) {
      if (azureSolutionSettings.activeResourcePlugins.includes("fx-resource-frontend-hosting")) {
        this.handlebarsContext.config.deploy.ssoTab = {
          functionName,
        };
      }

      if (azureSolutionSettings.activeResourcePlugins.includes("fx-resource-bot")) {
        this.handlebarsContext.config.deploy.ssoBot = true;
      }

      if (functionName) {
        this.handlebarsContext.config.deploy.ssoFunction = true;
      }
    }
  }
}
