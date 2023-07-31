// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  identifier,
  importDeclaration,
  importSpecifier,
  literal,
  ImportDeclaration,
  ASTPath,
  importNamespaceSpecifier,
  Identifier,
  JSXIdentifier,
  TSTypeParameter,
  importDefaultSpecifier,
  ImportSpecifier,
  TSImportEqualsDeclaration,
  TSExternalModuleReference,
  CallExpression,
  ImportExpression,
} from "jscodeshift";
import jscodeshift = require("jscodeshift");
import { Collection } from "jscodeshift/src/Collection";
import {
  CommentMessages,
  teamsClientSDKName,
  teamsClientSDKDefaultNamespace,
} from "../../constants";
import { ImportInfo } from "./importInfo";

/**
 * This function is to determine whether an import declaration is from Teams Client SDK
 * @param p AST node path to the import declaration node
 * @returns a boolean value if p.node.source is called / whose value is '@microsoft/teams-js' or not
 */
export function isTeamsClientSDKImport(
  p: ASTPath<ImportDeclaration> | ASTPath<TSImportEqualsDeclaration>
): boolean {
  if (p.node.type === "ImportDeclaration") {
    return p.node.source.value === teamsClientSDKName;
  } else {
    return (
      p.node.moduleReference.type === "TSExternalModuleReference" &&
      p.node.moduleReference.expression.value === teamsClientSDKName
    );
  }
}

export function isTeamsClientSDKTsRequireCallExpression(p: ASTPath<CallExpression>): boolean {
  return (
    p.node.callee.type === "Identifier" &&
    p.node.callee.name === "require" &&
    p.node.arguments.length === 1 &&
    p.node.arguments[0].type === "StringLiteral" &&
    p.node.arguments[0].value === teamsClientSDKName
  );
}

export function isTeamsClientSDKTsImportCallExpression(p: ASTPath<CallExpression>): boolean {
  return (
    p.node.callee.type === "Import" &&
    p.node.arguments.length === 1 &&
    p.node.arguments[0].type === "StringLiteral" &&
    p.node.arguments[0].value === teamsClientSDKName
  );
}

export function isTeamsClientSDKJsRequireCallExpression(p: ASTPath<CallExpression>): boolean {
  return (
    p.node.callee.type === "Identifier" &&
    p.node.callee.name === "require" &&
    p.node.arguments.length === 1 &&
    p.node.arguments[0].type === "Literal" &&
    p.node.arguments[0].value === teamsClientSDKName
  );
}

export function isTeamsClientSDKJsImportExpression(p: ASTPath<ImportExpression>): boolean {
  return p.node.source.type === "Literal" && p.node.source.value === teamsClientSDKName;
}

/**
 * This function is to replace the import declarations
 * @param importDeclarationPaths AST node paths to the import declaration nodes
 * @param importInfo The import module source, alias and target
 */
export function replaceImport(
  importDeclarationPaths: Collection<ImportDeclaration>,
  tsImportEqualsDeclarationPaths: Collection<TSImportEqualsDeclaration>,
  requireCallExpressionPaths: Collection<CallExpression>,
  importCallExpressionPaths: Collection<CallExpression> | Collection<ImportExpression>,
  importInfo: ImportInfo
): void {
  const importSpecifiers: ImportSpecifier[] = [];
  const importTargetSet: Set<string> = new Set();
  importInfo.importSingleExportInfo.forEach((info) => {
    if (info.target) {
      /** Module in mappings.json and has been used
       * i.e. source: import { appInitialization as appInit, appInitialization } from "@microsoft/teams-js";
       *      target: import { app } from "@microsoft/teams-js";
       * i.e. source: import { settings as msftsettings, initializeWithFrameContext } from "@microsoft/teams-js";
       *      target: import { pages } from "@microsoft/teams-js";
       */
      if (!importTargetSet.has(info.target)) {
        const node = importSpecifier(identifier(info.target));
        importSpecifiers.push(node);
        importTargetSet.add(info.target);
      }
    } else {
      /** Module not in mappings.json
       * i.e. source: import { Context, Context as TeamsContext } from "@microsoft/teams-js";
       *      target: import { Context, Context as TeamsContext } from "@microsoft/teams-js";
       */
      // TODO: remove imported, changed in mapping and never used importSpecifier
      const node = importSpecifier(
        identifier(info.source),
        info.alias ? identifier(info.alias) : undefined
      );
      importSpecifiers.push(node);
    }
  });

  const importDeclarations: ImportDeclaration[] = [];

  if (importSpecifiers.length > 0) {
    const importSpecifierNode = importDeclaration(importSpecifiers, literal(teamsClientSDKName));
    importDeclarations.push(importSpecifierNode);
  }

  const importEntireModuleTargetSet: Set<string> = new Set();
  importInfo.importEntireModuleInfo.forEach((info) => {
    if (importEntireModuleTargetSet.has(info.alias)) {
      return;
    }
    importEntireModuleTargetSet.add(info.alias);

    if (info.type === "ImportDefaultSpecifier") {
      // i.e. source: import microsoftTeams from "@microsoft/teams-js";
      //      target: import microsoftTeams from "@microsoft/teams-js";
      const node = importDeclaration(
        [importDefaultSpecifier(identifier(info.alias))],
        literal(teamsClientSDKName)
      );
      importDeclarations.push(node);
    } else if (info.type === "ImportNamespaceSpecifier") {
      // i.e. source: import * as msft from "@microsoft/teams-js";
      //      target: import * as msft from "@microsoft/teams-js";
      // i.e. source: import "@microsoft/teams-js";
      //      target: import * as microsoftTeams from "@microsoft/teams-js";
      const node = importDeclaration(
        [importNamespaceSpecifier(identifier(info.alias))],
        literal(teamsClientSDKName)
      );
      importDeclarations.push(node);
    } else if (info.type === "TSImportEqualsDeclaration") {
      // i.e. source: import msft = require("@microsoft/teams-js");
      //      target: import msft = require("@microsoft/teams-js");
      tsImportEqualsDeclarationPaths.forEach((p) => {
        (p.node.moduleReference as TSExternalModuleReference).expression.value = teamsClientSDKName;
      });
    }
  });

  if (importDeclarations.length > 0) {
    importDeclarations[0].comments = importDeclarationPaths.paths()[0].node.comments;
    importDeclarationPaths.paths()[0].insertBefore(...importDeclarations);
  }

  importDeclarationPaths.remove();

  requireCallExpressionPaths.forEach((p) => {
    p.node.comments = [
      jscodeshift.commentLine(CommentMessages.RequireModuleNotHandled, true, false),
    ];
  });

  importCallExpressionPaths.forEach((p) => {
    p.node.comments = [
      jscodeshift.commentLine(CommentMessages.DynamicImportNotHandled, true, false),
    ];
  });
}

function isIdentifier(node: Identifier | JSXIdentifier | TSTypeParameter | null | undefined) {
  if (!node) {
    return false;
  }
  return node.type === "Identifier";
}

/**
 * This function is to find out all the import declarations
 * @param importDeclarationPaths AST node paths to the import declaration nodes
 * @return The import module source, alias and target
 */
export function getTeamsClientSDKReferencePrefixes(
  importDeclarationPaths: Collection<ImportDeclaration>,
  tsImportEqualsDeclarationPaths: Collection<TSImportEqualsDeclaration>
): ImportInfo {
  const importInfo: ImportInfo = {
    importSingleExportInfo: [],
    importEntireModuleInfo: [],
  };
  importDeclarationPaths.forEach((path) => {
    // i.e. import "@microsoft/teams-js";
    if (!path.node.specifiers || path.node.specifiers.length == 0) {
      importInfo.importEntireModuleInfo.push({
        type: "ImportNamespaceSpecifier",
        alias: teamsClientSDKDefaultNamespace,
      });
    }
    path.node.specifiers?.forEach((specifier) => {
      if (specifier.type === "ImportSpecifier" && isIdentifier(specifier.imported)) {
        // i.e. import { importedNameA, importedNameB as alias } from "@microsoft/teams-js";
        const alias =
          specifier.local && isIdentifier(specifier.local) ? specifier.local.name : undefined;
        importInfo.importSingleExportInfo.push({
          source: specifier.imported.name,
          alias: alias,
        });
      } else if (
        specifier.type === "ImportDefaultSpecifier" &&
        isIdentifier(specifier.local) &&
        specifier.local?.name
      ) {
        // i.e. import importDefaultAlias from "@microsoft/teams-js";
        importInfo.importEntireModuleInfo.push({
          type: "ImportDefaultSpecifier",
          alias: specifier.local?.name,
        });
      } else if (
        specifier.type === "ImportNamespaceSpecifier" &&
        isIdentifier(specifier.local) &&
        specifier.local?.name
      ) {
        // i.e. import * as alias from "@microsoft/teams-js";
        importInfo.importEntireModuleInfo.push({
          type: "ImportNamespaceSpecifier",
          alias: specifier.local?.name,
        });
      }
    });
  });

  tsImportEqualsDeclarationPaths.forEach((path) => {
    // i.e. import msft = require("@microsoft/teams-js");
    importInfo.importEntireModuleInfo.push({
      type: "TSImportEqualsDeclaration",
      alias: path.node.id.name,
    });
  });
  return importInfo;
}
