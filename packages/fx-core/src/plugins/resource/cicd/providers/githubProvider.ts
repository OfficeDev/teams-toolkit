// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CICDProvider } from "./provider";
import { Result, FxError, ok } from "@microsoft/teamsfx-api";
import path from "path";
import * as fs from "fs-extra";
import { InternalError } from "../errors";
import { URLPrefixes } from "../constants";
import Mustache, { render } from "mustache";
import { getTemplatesFolder } from "../../../..";

export class GitHubProvider extends CICDProvider {
  private static instance: GitHubProvider;
  static getInstance() {
    if (!GitHubProvider.instance) {
      GitHubProvider.instance = new GitHubProvider();
      GitHubProvider.instance.scaffoldTo = ".github/workflows";
      GitHubProvider.instance.providerName = "github";
      GitHubProvider.instance.sourceTemplateName = (templateName: string) => {
        return `${templateName}.yml`;
      };
      GitHubProvider.instance.targetTemplateName = (templateName: string, envName: string) => {
        return `${templateName}.${envName}.yml`;
      };
    }
    return GitHubProvider.instance;
  }
}
