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
  Transform,
  Options,
  TSImportEqualsDeclaration,
  CallExpression,
  ImportExpression,
  Identifier,
} from "jscodeshift";
import { Collection } from "jscodeshift/src/Collection";
import { replaceFunction } from "./ts/replaceFunction";
import {
  getTeamsClientSDKReferencePrefixes,
  isTeamsClientSDKImport,
  isTeamsClientSDKJsImportExpression,
  isTeamsClientSDKJsRequireCallExpression,
  replaceImport,
} from "./ts/replaceTsImport";
import * as constants from "../constants";

/**
 * core function to migrate sdk in a JavaScript file and would be called and executed
 * automatically by jscodeshift
 * @param file command args from jscodeshift
 * @param api jscodeshift API
 * @returns string of the file content edited by jscodeshift
 */
const transform: Transform = (file: FileInfo, api: API, options: Options): string | null => {
  /**
   * import jscodeshift and parse file to AST tree
   */
  const j: JSCodeshift = api.jscodeshift;
  const root: Collection<any> = j(file.source);

  /**
   * find all of import declarations related to Teams Client SDK
   * and temporarily save the collection of nodes
   */
  const teamsClientSDKImportDeclarationPaths: Collection<ImportDeclaration> = root
    .find(ImportDeclaration)
    .filter(isTeamsClientSDKImport);

  const teamsClientSDKTsImportEqualsDeclarationPaths: Collection<TSImportEqualsDeclaration> = root
    .find(TSImportEqualsDeclaration)
    .filter(isTeamsClientSDKImport);

  const teamsClientSDKRequireCallExpressionPaths: Collection<CallExpression> = root
    .find(CallExpression)
    .filter(isTeamsClientSDKJsRequireCallExpression);
  const teamsClientSDKImportExpressionPaths: Collection<ImportExpression> = root
    .find(ImportExpression)
    .filter(isTeamsClientSDKJsImportExpression);

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

  if (!hasImportDeclaration && teamsClientSDKReferences.length > 0) {
    importInfo.importEntireModuleInfo.pop();
  }

  replaceImport(
    teamsClientSDKImportDeclarationPaths,
    teamsClientSDKTsImportEqualsDeclarationPaths,
    teamsClientSDKRequireCallExpressionPaths,
    teamsClientSDKImportExpressionPaths,
    importInfo
  );

  options.quote = "double";
  return root.toSource(options);
};
export default transform;
