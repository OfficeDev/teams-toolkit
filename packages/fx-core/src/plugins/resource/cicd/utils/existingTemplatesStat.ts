// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProviderKind } from "../providers/enums";
import { CICDProviderFactory } from "../providers/factory";
import {
  azdoOption,
  cdOption,
  ciOption,
  githubOption,
  jenkinsOption,
  provisionOption,
  publishOption,
} from "../questions";
import * as fs from "fs-extra";
import * as path from "path";

export class ExistingTemplatesStat {
  public static instance: ExistingTemplatesStat;
  public static genKey = (...args: string[]) => {
    return args.join("_");
  };
  public existence = new Map<string, boolean>([]);
  private envNames: string[];
  private projectPath: string;
  static async getInstance(
    projectPath: string,
    envNames: string[]
  ): Promise<ExistingTemplatesStat> {
    if (!ExistingTemplatesStat.instance) {
      ExistingTemplatesStat.instance = new ExistingTemplatesStat(projectPath, envNames);
      await ExistingTemplatesStat.instance.scan();
    }

    return ExistingTemplatesStat.instance;
  }

  private constructor(projectPath: string, envNames: string[]) {
    this.existence.clear();
    this.envNames = envNames;
    this.projectPath = projectPath;
  }

  public async scan() {
    // (envName, provider, template) -> existing (true or false)
    // (envName,) -> allExisting (true or false)
    // (envName, provider) -> allExisting (true or false)
    for (const envName of this.envNames) {
      let envAllExisting = true;
      for (const provider of [githubOption.id, azdoOption.id, jenkinsOption.id]) {
        const providerInstance = CICDProviderFactory.create(provider as ProviderKind);
        let providerAllExisting = true;
        for (const template of [ciOption.id, provisionOption.id, cdOption.id, publishOption.id]) {
          const existing = await fs.pathExists(
            path.join(
              this.projectPath,
              providerInstance.scaffoldTo,
              providerInstance.targetTemplateName!(template, envName)
            )
          );
          this.existence.set(ExistingTemplatesStat.genKey(envName, provider, template), existing);

          if (!existing) {
            providerAllExisting = false;
          }
        }

        this.existence.set(ExistingTemplatesStat.genKey(envName, provider), providerAllExisting);

        if (!providerAllExisting) {
          envAllExisting = false;
        }
      }
      this.existence.set(envName, envAllExisting);
    }
  }
}
