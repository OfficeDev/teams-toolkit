// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureSolutionSettings, ProjectSettings } from "@microsoft/teamsfx-api";
import { FileType, namingConverterV3 } from "../MigrationUtils";
import * as path from "path";
import * as fs from "fs-extra";
import * as handlebars from "handlebars";
import { getTemplatesFolder } from "../../../folder";
import { MigrationContext } from "./migrationContext";

export class AppYmlGenerator {
  private handlebarsContext: {
    activePlugins: Record<string, boolean>;
    placeholderMappings: Record<string, string>;
    aadAppName: string | undefined;
    teamsAppName: string | undefined;
    appName: string | undefined;
  };
  constructor(
    private oldProjectSettings: ProjectSettings,
    private bicepContent: string,
    private projectPath: string
  ) {
    this.handlebarsContext = {
      activePlugins: {},
      placeholderMappings: {},
      aadAppName: undefined,
      teamsAppName: undefined,
      appName: undefined,
    };

    this.generateHandlerbarsContext();
  }

  public async generateAppYml(): Promise<string> {
    const solutionSettings = this.oldProjectSettings.solutionSettings as AzureSolutionSettings;
    if (solutionSettings.hostType === "Azure") {
      switch (this.oldProjectSettings.programmingLanguage?.toLowerCase()) {
        case "javascript":
        case "typescript":
          return await this.buildHandlebarsTemplate("js.ts.app.yml");
        case "csharp":
          return await this.buildHandlebarsTemplate("csharp.app.yml");
      }
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

  private async generateHandlerbarsContext(): Promise<void> {
    // project setting information
    this.handlebarsContext.appName = this.oldProjectSettings.appName;

    const azureSolutionSettings = this.oldProjectSettings.solutionSettings as AzureSolutionSettings;
    for (const activePlugin of azureSolutionSettings.activeResourcePlugins) {
      this.handlebarsContext.activePlugins[activePlugin] = true; // convert array items to object properties to simplify handlebars template
    }

    // app names
    const aadManifest = await fs.readJson(
      path.join(this.projectPath, "aad.manifest.template.json")
    );
    const teamsAppManifest = await fs.readJson(
      path.join(this.projectPath, "appPackage/manifest.template.json")
    );
    this.handlebarsContext.aadAppName = aadManifest.name;
    this.handlebarsContext.teamsAppName = teamsAppManifest.name.short;

    // placeholders
    this.setPlaceholderMapping("state.fx-resource-frontend-hosting.storageResourceId");
    this.setPlaceholderMapping("state.fx-resource-frontend-hosting.endpoint");
    this.setPlaceholderMapping("state.fx-resource-frontend-hosting.resourceId");
    this.setPlaceholderMapping("state.fx-resource-bot.resourceId");
  }

  private setPlaceholderMapping(placeholder: string): void {
    const result = namingConverterV3(placeholder, FileType.STATE, this.bicepContent);
    if (result.isOk()) {
      this.handlebarsContext.placeholderMappings[placeholder] = result.value;
    }
    // ignore non-exist placeholder
  }
}
