// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from "path";

import { Commands, CommonConstants, FunctionPluginPathInfo } from "./constants";
import { FunctionLanguage, NodeVersion } from "./enums";

export interface FunctionLanguageStrategy {
    /* For scaffolding. */
    getFunctionEntryFileOrFolderName: (entryName: string) => string,

    /* For provision. */
    functionAppRuntimeSettings: (version?: string) =>{ [key: string]: string },

    /* For deployment. */
    skipFuncExtensionInstall: boolean,
    hasUpdatedContentFilter?: (itemPath: string) => boolean,
    buildCommands: {
        command: string,
        relativePath: string
    }[],
    deployFolderRelativePath: string
}

const NodeJSCommonStrategy: FunctionLanguageStrategy = {
    getFunctionEntryFileOrFolderName: (entryName: string) => entryName,
    functionAppRuntimeSettings: (version?: string) => {
        return {
            "FUNCTIONS_WORKER_RUNTIME": "node",
            "WEBSITE_NODE_DEFAULT_VERSION": `~${version ?? NodeVersion.Version12}`
        };
    },
    skipFuncExtensionInstall: false,
    /* We skip scanning node_modules folder for node because it has too many small files.
     * Its consistency can be guaranteed by `npm install`.
     */
    hasUpdatedContentFilter: (itemPath: string) => path.basename(itemPath) !== FunctionPluginPathInfo.npmPackageFolderName,
    buildCommands: [],
    deployFolderRelativePath: CommonConstants.emptyString
};

const JavaScriptLanguageStrategy: FunctionLanguageStrategy = {
    ...NodeJSCommonStrategy,
    buildCommands: [{
        command: Commands.npmInstallProd,
        relativePath: CommonConstants.emptyString
    }]
};

const TypeScriptLanguageStrategy: FunctionLanguageStrategy = {
    ...NodeJSCommonStrategy,
    buildCommands: [{
        command: Commands.npmInstall,
        relativePath: CommonConstants.emptyString
    }, {
        command: Commands.npmBuild,
        relativePath: CommonConstants.emptyString
    }],
};

// const CSharpLanguageStrategy: FunctionLanguageStrategy = {
//     getFunctionEntryFileOrFolderName: (entryName: string) => `${entryName}.cs`,
//     functionAppRuntimeSettings: (version?: string) => {
//         return {
//             "FUNCTIONS_WORKER_RUNTIME": "dotnet"
//         };
//     },
//     skipFuncExtensionInstall: true,
//     buildCommands: [{
//         command: Commands.dotnetPublish,
//         relativePath: CommonConstants.emptyString
//     }],
//     deployFolderRelativePath: path.join("bin", "Release", "netcoreapp3.1", "publish")
// };

export class LanguageStrategyFactory {
    public static getStrategy(language: FunctionLanguage): FunctionLanguageStrategy {
        switch (language) {
            case FunctionLanguage.JavaScript:
                return JavaScriptLanguageStrategy;
            case FunctionLanguage.TypeScript:
                return TypeScriptLanguageStrategy;
            // case FunctionLanguage.CSharp:
            //     return CSharpLanguageStrategy;
        }
    }
}
