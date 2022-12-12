// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProjectSettings } from "@microsoft/teamsfx-api";
import { BuildArgs } from "../../../../component/driver/interface/buildAndDeployArgs";
import { InstallToolArgs } from "../../../../component/driver/prerequisite/interfaces/InstallToolArgs";
import { BaseAppYmlGenerator } from "../appYmlGenerator";

export class AppLocalYmlConfig {
  deploy?: {
    tools?: InstallToolArgs;
    npmCommands?: BuildArgs[];
    dotnetCommand?: BuildArgs;
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
    switch (this.oldProjectSettings.programmingLanguage?.toLowerCase()) {
      case "javascript":
      case "typescript":
      default:
        // only support js/ts at first
        return await this.buildHandlebarsTemplate("js.ts.app.local.yml");
    }
  }
}
