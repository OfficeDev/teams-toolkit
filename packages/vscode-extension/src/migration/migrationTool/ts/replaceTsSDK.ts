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
  Identifier,
  ASTPath,
  CallExpression,
} from "jscodeshift";
import { replaceFunction } from "./replaceFunction";
import { ImportInfo } from "./importInfo";
import { replaceEnum } from "./replaceEnum";
import {
  getTeamsClientSDKReferencePrefixes,
  isTeamsClientSDKImport,
  isTeamsClientSDKTsRequireCallExpression,
  isTeamsClientSDKTsImportCallExpression,
  replaceImport,
} from "./replaceTsImport";
import { replaceInterface } from "./replaceTsInterface";

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

  /**
   * if there is no Teams Client SDK imported, nothing should be replaced
   */
  if (
    teamsClientSDKImportDeclarationPaths.length == 0 &&
    teamsClientSDKTsImportEqualsDeclarationPaths.length === 0 &&
    teamsClientSDKRequireCallExpressionPaths.length === 0 &&
    teamsClientSDKImportCallExpressionPaths.length === 0
  ) {
    return null;
  }

  const importInfo = getTeamsClientSDKReferencePrefixes(
    teamsClientSDKImportDeclarationPaths,
    teamsClientSDKTsImportEqualsDeclarationPaths
  );

  replaceFunction(j, root, importInfo);

  replaceInterface(j, root, importInfo);

  replaceEnum(j, root, importInfo);

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
