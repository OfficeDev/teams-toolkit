// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProjectSettings } from "@microsoft/teamsfx-api";
import { BuildArgs } from "../../../../component/driver/interface/buildAndDeployArgs";
import { InstallToolArgs } from "../../../../component/driver/tools/interfaces/InstallToolArgs";
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
    activePlugins: Record<string, boolean>;
    config: AppLocalYmlConfig;
  };

  constructor(oldProjectSettings: ProjectSettings, config: AppLocalYmlConfig) {
    super(oldProjectSettings);
    this.handlebarsContext = {
      activePlugins: {},
      config: config,
    };

    this.generateActivePluginsContext();
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
