// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import * as fs from "fs-extra";
import path from "path";
import { getLocalizedString } from "../../../common/localizeUtils";
import { getSampleFileName } from "./utils";

const httpRegex = /^http[s]?:\/\/.+/;
const guidRegex = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;

export async function checkApiNameExist(
  input: string,
  projectPath: string,
  components: string[],
  languageType: string
): Promise<string | undefined> {
  const apiFileName: string = getSampleFileName(input, languageType);
  for (const component of components) {
    const componentPath = path.join(projectPath, component);
    // This pathExistsSync is a workaround for cli interactive command.
    if (fs.pathExistsSync(path.join(componentPath, apiFileName))) {
      return getLocalizedString(
        "plugins.apiConnector.QuestionAppName.validation.ApiNameExist",
        apiFileName
      );
    }
  }
  return undefined;
}

export async function checkEmptyValue(input: string): Promise<string | undefined> {
  if (input) {
    return undefined;
  }
  return getLocalizedString("plugins.apiConnector.Question.validation.EmptyValue");
}

export async function checkApiNameValid(input: string): Promise<string | undefined> {
  if (input.match(/[^a-zA-Z0-9]/)) {
    return getLocalizedString(
      "plugins.apiConnector.QuestionAppName.validation.ApiNameAlphanumeric"
    );
  }
  if (input.match(/^[0-9]/)) {
    return getLocalizedString(
      "plugins.apiConnector.QuestionAppName.validation.ApiNameNumberPrefix"
    );
  }
  return undefined;
}

export async function checkEmptySelect(input: string[]): Promise<string | undefined> {
  const name = input as string[];
  if (name.length === 0) {
    return getLocalizedString("plugins.apiConnector.questionComponentSelect.emptySelection");
  }
  return undefined;
}

export async function checkIsGuid(input: string): Promise<string | undefined> {
  if (guidRegex.exec(input)) {
    return undefined;
  }
  return getLocalizedString("plugins.apiConnector.Question.validation.NotGuid");
}

export async function checkHttp(input: string): Promise<string | undefined> {
  if (httpRegex.exec(input)) {
    return undefined;
  }
  return getLocalizedString("plugins.apiConnector.QuestionApiEndpoint.validation.NotHttp");
}
