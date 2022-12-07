// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureSolutionSettings, ProjectSettings } from "@microsoft/teamsfx-api";
import * as path from "path";
import * as fs from "fs-extra";
import * as handlebars from "handlebars";
import { getTemplatesFolder } from "../../../../folder";
import { BuildArgs } from "../../../../component/driver/interface/buildAndDeployArgs";
import { InstallToolArgs } from "../../../../component/driver/tools/interfaces/InstallToolArgs";

export class AppLocalYmlConfig {
  public deploy: {
    tools: InstallToolArgs;
    npmCommands: BuildArgs[];
    dotnetCommand?: BuildArgs;
  };

  constructor() {
    this.deploy = {
      tools: {},
      npmCommands: [],
    };
  }
}

export class AppLocalYmlGenerator {
  private handlebarsContext: {
    activePlugins: Record<string, boolean>;
    config: AppLocalYmlConfig;
  };
  constructor(private oldProjectSettings: ProjectSettings, config: AppLocalYmlConfig) {
    this.handlebarsContext = {
      activePlugins: {},
      config: config,
    };

    this.generateHandlerbarsContext();
  }

  public async generateAppYml(): Promise<string> {
    switch (this.oldProjectSettings.programmingLanguage?.toLowerCase()) {
      case "javascript":
      case "typescript":
      default:
        // only support js/ts at first
        return await this.buildHandlebarsTemplate("js.ts.app.yml");
    }

    throw new Error(
      "The current tooling cannot upgrade your project temporary. Please raise an issue in GitHub for your project."
    );
  }

  private async buildHandlebarsTemplate(templateName: string): Promise<string> {
    const templatePath = path.join(getTemplatesFolder(), "core/v3Migration", templateName);
    const templateString = await fs.readFile(templatePath, "utf8");
    const template = handlebars.compile(templateString);
    return template(this.handlebarsContext);
  }

  private generateHandlerbarsContext(): void {
    const azureSolutionSettings = this.oldProjectSettings.solutionSettings as AzureSolutionSettings;
    for (const activePlugin of azureSolutionSettings.activeResourcePlugins) {
      this.handlebarsContext.activePlugins[activePlugin] = true; // convert array items to object properties to simplify handlebars template
    }
  }
}
