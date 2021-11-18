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

  /**
   * if there is no Teams Client SDK imported, nothing should be replaced
   */
  if (
    teamsClientSDKImportDeclarationPaths.length === 0 &&
    teamsClientSDKTsImportEqualsDeclarationPaths.length === 0 &&
    teamsClientSDKRequireCallExpressionPaths.length === 0 &&
    teamsClientSDKImportExpressionPaths.length === 0
  ) {
    return null;
  }

  const importInfo = getTeamsClientSDKReferencePrefixes(
    teamsClientSDKImportDeclarationPaths,
    teamsClientSDKTsImportEqualsDeclarationPaths
  );

  replaceFunction(j, root, importInfo);

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
