// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProviderKind } from "./provider/enums";
import { CICDProviderFactory } from "./provider/factory";
import { providerOptions, templateOptions } from "./questions";
import * as fs from "fs-extra";
import * as path from "path";
import { OptionItem } from "@microsoft/teamsfx-api";

export class ExistingTemplatesStat {
  public static instance: ExistingTemplatesStat;
  public static genKey = (...args: string[]) => {
    return args.join("_");
  };
  public existence = new Map<string, boolean>([]);
  private envNames: string[];
  private projectPath: string;
  static getInstance(projectPath: string, envNames: string[]): ExistingTemplatesStat {
    if (!ExistingTemplatesStat.instance) {
      ExistingTemplatesStat.instance = new ExistingTemplatesStat(projectPath, envNames);
    }

    return ExistingTemplatesStat.instance;
  }

  private constructor(projectPath: string, envNames: string[]) {
    this.existence.clear();
    this.envNames = envNames;
    this.projectPath = projectPath;
  }

  public notExisting(...args: string[]): boolean {
    const key = ExistingTemplatesStat.genKey(...args);
    return !this.existence.get(key);
  }

  public availableEnvOptions(): OptionItem[] {
    return this.envNames
      .filter((envName) => !this.existence.get(envName))
      .map((envName) => {
        return { id: envName, label: envName };
      });
  }

  public availableProviderOptions(envName: string): OptionItem[] {
    return providerOptions.filter((providerOption) => {
      return !this.existence.get(ExistingTemplatesStat.genKey(envName, providerOption.id));
    });
  }

  public availableTemplateOptions(envName: string, provider: string): OptionItem[] {
    return templateOptions().filter((templateOption) => {
      return !this.existence.get(
        ExistingTemplatesStat.genKey(envName, provider, templateOption.id)
      );
    });
  }

  public async scan() {
    // (envName, provider, template) -> existing (true or false)
    // (envName,) -> allExisting (true or false)
    // (envName, provider) -> allExisting (true or false)
    this.existence.clear();
    for (const envName of this.envNames) {
      let envAllExisting = true;
      for (const provider of providerOptions) {
        const providerInstance = CICDProviderFactory.create(provider.id as ProviderKind);
        let providerAllExisting = true;
        for (const template of templateOptions()) {
          const existing = await fs.pathExists(
            path.join(
              this.projectPath,
              providerInstance.scaffoldTo,
              providerInstance.targetTemplateName!(template.id, envName)
            )
          );
          this.existence.set(
            ExistingTemplatesStat.genKey(envName, provider.id, template.id),
            existing
          );

          if (!existing) {
            providerAllExisting = false;
          }
        }

        this.existence.set(ExistingTemplatesStat.genKey(envName, provider.id), providerAllExisting);

        if (!providerAllExisting) {
          envAllExisting = false;
        }
      }
      this.existence.set(envName, envAllExisting);
    }
  }
}
