// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from "path";
import { PathConstants, ProgrammingLanguage } from "../../constants";
import { invalidProjectSettings } from "../../error";
import { ErrorMessage } from "../../messages";
import { Commands } from "../constants";

export interface FunctionLanguageStrategy {
  /* For scaffolding. */
  getFunctionEntryFileOrFolderName: (entryName: string) => string;

  /* For deployment. */
  skipFuncExtensionInstall: boolean;
  hasUpdatedContentFilter?: (itemPath: string) => boolean;
  buildCommands: {
    command: string;
    relativePath: string;
  }[];
  deployFolderRelativePath: string;
}

const NodeJSCommonStrategy: FunctionLanguageStrategy = {
  getFunctionEntryFileOrFolderName: (entryName: string) => entryName,
  skipFuncExtensionInstall: false,
  /* We skip scanning node_modules folder for node because it has too many small files.
   * Its consistency can be guaranteed by `npm install`.
   */
  hasUpdatedContentFilter: (itemPath: string) =>
    path.basename(itemPath) !== PathConstants.npmPackageFolderName,
  buildCommands: [],
  deployFolderRelativePath: "",
};

const JavaScriptLanguageStrategy: FunctionLanguageStrategy = {
  ...NodeJSCommonStrategy,
  buildCommands: [
    {
      command: Commands.NpmInstallProd,
      relativePath: "",
    },
  ],
};

const TypeScriptLanguageStrategy: FunctionLanguageStrategy = {
  ...NodeJSCommonStrategy,
  buildCommands: [
    {
      command: Commands.NpmInstall,
      relativePath: "",
    },
    {
      command: Commands.NpmBuild,
      relativePath: "",
    },
  ],
};

export class LanguageStrategyFactory {
  public static getStrategy(language: ProgrammingLanguage): FunctionLanguageStrategy {
    switch (language) {
      case ProgrammingLanguage.JS:
        return JavaScriptLanguageStrategy;
      case ProgrammingLanguage.TS:
        return TypeScriptLanguageStrategy;
      default:
        throw new invalidProjectSettings(ErrorMessage.programmingLanguageInvalid);
    }
  }
}
