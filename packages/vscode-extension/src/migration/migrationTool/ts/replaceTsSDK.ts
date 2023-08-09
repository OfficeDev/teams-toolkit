// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * For TODO related to print log to console, try to use jsdiff, a package which could compare two files/blocks/lines
 * https://www.npmjs.com/package/diff/v/3.5.0
 * self-made log helper could be referred from kangxuan/demo
 */
import {
  JSCodeshift,
  API,
  FileInfo,
  ImportDeclaration,
  TSImportEqualsDeclaration,
  Transform,
  Options,
  Collection,
  CallExpression,
  Identifier,
} from "jscodeshift";
import { replaceFunction } from "./replaceFunction";
import { replaceEnum } from "./replaceEnum";
import {
  getTeamsClientSDKReferencePrefixes,
  isTeamsClientSDKImport,
  isTeamsClientSDKTsRequireCallExpression,
  isTeamsClientSDKTsImportCallExpression,
  replaceImport,
} from "./replaceTsImport";
import { replaceInterface } from "./replaceTsInterface";
import * as constants from "../../constants";

/**
 * core function to migrate sdk in a TypeScript file and would be called and executed
 * automatically by jscodeshift
 * @param file command args from jscodeshift
 * @param api jscodeshift API
 * @returns string of the file content edited by jscodeshift
 */
const transformTs: Transform = (file: FileInfo, api: API, options: Options): string | null => {
  /**
   * import jscodeshift and parse file to AST tree
   */
  const j: JSCodeshift = api.jscodeshift;
  const root: Collection<any> = j(file.source);

  const teamsClientSDKImportDeclarationPaths: Collection<ImportDeclaration> = root
    .find(ImportDeclaration)
    .filter(isTeamsClientSDKImport);

  const teamsClientSDKTsImportEqualsDeclarationPaths: Collection<TSImportEqualsDeclaration> = root
    .find(TSImportEqualsDeclaration)
    .filter(isTeamsClientSDKImport);

  const teamsClientSDKRequireCallExpressionPaths: Collection<CallExpression> = root
    .find(CallExpression)
    .filter(isTeamsClientSDKTsRequireCallExpression);
  const teamsClientSDKImportCallExpressionPaths: Collection<CallExpression> = root
    .find(CallExpression)
    .filter(isTeamsClientSDKTsImportCallExpression);

  const importInfo = getTeamsClientSDKReferencePrefixes(
    teamsClientSDKImportDeclarationPaths,
    teamsClientSDKTsImportEqualsDeclarationPaths
  );

  // If there is
  //   1. import * as microsoftTeams from "@microsoft/teams-js", or
  //   2. import microsoftTeams from "@microsoft/teams-js", or
  //   3. import "@microsoft/teams-js", or
  //   4. import microsoftTeams = require("@microsoft/teams-js")
  const hasImportDeclaration = importInfo.importEntireModuleInfo.some(
    (info) => info.alias === constants.teamsClientSDKDefaultNamespace
  );
  const teamsClientSDKReferences = root
    .find(Identifier)
    .filter((p) => p.node.name === constants.teamsClientSDKDefaultNamespace);
  if (!hasImportDeclaration && teamsClientSDKReferences.length > 0) {
    // import * as microsoftTeams from "@microsoft/teams-js"
    importInfo.importEntireModuleInfo.push({
      type: "ImportNamespaceSpecifier",
      alias: constants.teamsClientSDKDefaultNamespace,
    });
  }

  replaceFunction(j, root, importInfo);

  replaceInterface(j, root, importInfo);

  replaceEnum(j, root, importInfo);

  if (!hasImportDeclaration && teamsClientSDKReferences.length > 0) {
    importInfo.importEntireModuleInfo.pop();
  }

  replaceImport(
    teamsClientSDKImportDeclarationPaths,
    teamsClientSDKTsImportEqualsDeclarationPaths,
    teamsClientSDKRequireCallExpressionPaths,
    teamsClientSDKImportCallExpressionPaths,
    importInfo
  );
  options.quote = "double";
  return root.toSource(options);
};

export default transformTs;
