/**
 * interface ImportInfo is to define all the import declarations
 * importSingleExportInfo include all the mappings of importing a single export from a module
 * The key of `importSingleExportInfo` is the source export name.
 * i.e. import { importedNameA, importedNameB as aliasB } from "@microsoft/teams-js";
 * {
 *  importSingleExportInfo:[
 *    {
 *       source: "importedNameA",
 *    },
 *    {
 *       source: "importedNameB",
 *       alias: "aliasB"
 *    },
 *  ]
 * }
 * importEntireModuleInfo include all the mappings of importing the entire module.
 * The key of `importEntireModuleInfo` is the target variable.
 * i.e. import * as msft from "@microsoft/teams-js";
 * {
 * 	 importEntireModuleInfo: [
 *     {
 *       alias: "msft",
 *       type: "ImportNamespaceSpecifier"
 *     }
 *   ]
 * }
 */
export interface ImportInfo {
  importSingleExportInfo: ImportSingleExportInfo[];
  importEntireModuleInfo: ImportEntireModuleInfo[];
}

/**
 * interface importSingleExportInfo is to define the information of importing a single export from a module
 * i.e. import { importedNameA } from "@microsoft/teams-js";
 * it should be defined using importSingleExportInfo interface and looks like below:
 * {
 *  source : 'importedNameA',
 * }
 * i.e. import { importedNameB as aliasB } from "@microsoft/teams-js";
 * it should be defined using importSingleExportInfo interface and looks like below:
 * {
 *  source: 'importedNameB',
 *  alias: 'aliasB',
 * }
 * i.e. import { importedNameC } from "@microsoft/teams-js";
 * after replace with the mapping microsoftTeams.importedNameC -> microsoftTeams.importedNameD.functionC
 * {
 *  source: 'importedNameC',
 *  target: 'importedNameD',
 * }
 */
export interface ImportSingleExportInfo {
  source: string;
  alias?: string;
  target?: string;
}

/**
 * interface importEntireModuleInfo is to define the information of importing the entire module into a single variable
 * i.e. import * as msft from "@microsoft/teams-js";
 * it should be defined using importEntireModuleInfo interface and looks like below:
 * {
 *  alias: 'msft',
 *  type: 'ImportNamespaceSpecifier',
 * }
 * i.e. import microsoftTeams from "@microsoft/teams-js";
 * it should be defined using importEntireModuleInfo interface and looks like below:
 * {
 *  alias: 'microsoftTeams',
 *  type: 'ImportDefaultSpecifier',
 * }
 * i.e. import "@microsoft/teams-js";
 * it will use the default namespace name 'microsoftTeams' and the output will be `import * as microsoftTeams from "@microsoft/teams-js";`
 * {
 *  alias: 'microsoftTeams',
 *  type: 'ImportNamespaceSpecifier',
 * }
 */
interface ImportEntireModuleInfo {
  alias: string;
  type: "ImportDefaultSpecifier" | "ImportNamespaceSpecifier" | "TSImportEqualsDeclaration";
}
