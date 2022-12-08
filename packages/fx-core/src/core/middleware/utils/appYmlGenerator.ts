// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureSolutionSettings, ProjectSettings } from "@microsoft/teamsfx-api";
import { FileType, namingConverterV3 } from "../MigrationUtils";
import * as path from "path";
import * as fs from "fs-extra";
import * as handlebars from "handlebars";
import { getTemplatesFolder } from "../../../folder";

export abstract class BaseAppYmlGenerator {
  protected abstract handlebarsContext: { activePlugins: Record<string, boolean> };
  constructor(protected oldProjectSettings: ProjectSettings) {}

  protected async buildHandlebarsTemplate(templateName: string): Promise<string> {
    const templatePath = path.join(getTemplatesFolder(), "core/v3Migration", templateName);
    const templateString = await fs.readFile(templatePath, "utf8");
    const template = handlebars.compile(templateString);
    return template(this.handlebarsContext);
  }

  protected generateActivePluginsContext(): void {
    const azureSolutionSettings = this.oldProjectSettings.solutionSettings as AzureSolutionSettings;
    for (const activePlugin of azureSolutionSettings.activeResourcePlugins) {
      this.handlebarsContext.activePlugins[activePlugin] = true; // convert array items to object properties to simplify handlebars template
    }
  }
}

export class AppYmlGenerator extends BaseAppYmlGenerator {
  protected handlebarsContext: {
    activePlugins: Record<string, boolean>;
    placeholderMappings: Record<string, string>;
  };
  constructor(oldProjectSettings: ProjectSettings, private bicepContent: string) {
    super(oldProjectSettings);
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
          return await this.buildHandlebarsTemplate("js.ts.app.yml");
      }
    }
    throw new Error(
      "The current tooling cannot upgrade your project temporary. Please raise an issue in GitHub for your project."
    );
  }

  private generateHandlerbarsContext(): void {
    this.generateActivePluginsContext();
    this.setPlaceholderMapping("state.fx-resource-frontend-hosting.storageResourceId");
    this.setPlaceholderMapping("state.fx-resource-frontend-hosting.endpoint");
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
