// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureSolutionSettings, ProjectSettings } from "@microsoft/teamsfx-api";
import { FileType, namingConverterV3 } from "../MigrationUtils";
import * as fs from "fs-extra";
import * as handlebars from "handlebars";

export class AppYmlGenerator {
  private handlebarsContext: {
    activePlugins: Record<string, boolean>;
    placeholderMappings: Record<string, string>;
  };
  constructor(private oldProjectSettings: ProjectSettings, private bicepContent: string) {
    this.handlebarsContext = {
      activePlugins: {},
      placeholderMappings: {},
    };

    this.generateHandlerbarsContext();
  }

  public async generateAppYml(): Promise<string> {
    const solutionSettings = this.oldProjectSettings.solutionSettings as AzureSolutionSettings;
    if (solutionSettings.hostType === "Azure") {
      switch (this.oldProjectSettings.programmingLanguage?.toLowerCase()) {
        case "javascript":
        case "typescript":
        default:
          // only support js/ts at first
          return await this.buildHandlebarsTemplate(
            "./templates/core/v3Migration/app.template.yml"
          );
      }
    }
    throw new Error(
      "The current tooling cannot upgrade your project temporary. Please raise an issue in GitHub for your project."
    );
  }

  private async buildHandlebarsTemplate(templatePath: string): Promise<string> {
    const templateString = await fs.readFile(templatePath);
    const template = handlebars.compile(templateString);
    return template(this.handlebarsContext);
  }

  private generateHandlerbarsContext(): void {
    const azureSolutionSettings = this.oldProjectSettings.solutionSettings as AzureSolutionSettings;
    for (const activePlugin of azureSolutionSettings.activeResourcePlugins) {
      this.handlebarsContext.activePlugins[activePlugin] = true; // convert array items to object properties to simplify handlebars template
    }

    this.setPlaceholderMapping("state.fx-resource-frontend-hosting.storageResourceId");
  }

  private setPlaceholderMapping(placeholder: string): void {
    const result = namingConverterV3(placeholder, FileType.STATE, this.bicepContent);
    if (result.isOk()) {
      this.handlebarsContext.placeholderMappings[placeholder] = result.value;
    } else {
      throw result.error;
    }
  }
}
