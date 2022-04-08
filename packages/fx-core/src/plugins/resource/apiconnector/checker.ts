// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import * as fs from "fs-extra";
import path from "path";
import { getLocalizedString } from "../../../common/localizeUtils";
import { getSampleFileName } from "./utils";

export async function checkApiNameExist(
  input: string,
  projectPath: string,
  components: string[],
  languageType: string
): Promise<string | undefined> {
  const apiFileName: string = getSampleFileName(input, languageType);
  for (const component of components) {
    const componentPath = path.join(projectPath, component);
    if (await fs.pathExists(path.join(componentPath, apiFileName))) {
      return getLocalizedString(
        "plugins.apiConnector.QuestionAppName.validation.ApiNameExist",
        apiFileName
      );
    }
  }
  return undefined;
}
