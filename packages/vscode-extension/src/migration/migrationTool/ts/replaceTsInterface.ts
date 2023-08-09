// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ASTPath,
  identifier,
  Identifier,
  JSCodeshift,
  JSXIdentifier,
  tsQualifiedName,
  TSQualifiedName,
  TSTypeParameter,
  TSTypeReference,
  TSExpressionWithTypeArguments,
} from "jscodeshift";
import { Collection } from "jscodeshift/src/Collection";
import { Replacement, TargetReplacement } from "./replacement";
import { buildReplacement, buildTargetReplacement } from "./replacementsGenerator";
import { ImportInfo } from "./importInfo";

// This function is to replace the interface
export function replaceInterface(
  j: JSCodeshift,
  root: Collection<any>,
  importInfo: ImportInfo
): void {
  const replacements: Replacement[] = buildReplacement("interfaceMappings");
  const [directlyImportReplacements, namespaceImportReplacements] = buildTargetReplacement(
    importInfo,
    replacements
  );

  // find all of TSTypeReference
  const tsTypeReferencePaths: Collection<TSTypeReference> = root.find(TSTypeReference);
  tsTypeReferencePaths.forEach((path) => {
    const typeNamePath = path.get("typeName") as ASTPath;
    replaceInterfacePath(typeNamePath, directlyImportReplacements, namespaceImportReplacements);
  });

  // find all of tsExpressionWithTypeArguments
  const tsExpressionWithTypeArgumentPaths: Collection<TSExpressionWithTypeArguments> = root.find(
    TSExpressionWithTypeArguments
  );
  tsExpressionWithTypeArgumentPaths.forEach((path) => {
    const expressionPath = path.get("expression") as ASTPath;
    replaceInterfacePath(expressionPath, directlyImportReplacements, namespaceImportReplacements);
  });
}

/**
 * Replace the interface node according to replacement rules
 * @param path The interface root path.
 * @param directlyImportReplacements The mapping of interface directly imported. i.e. import { interfaceA } from "";
 * @param namespaceImportReplacements The mapping of interface in namespace. i.e. import * as msft from ""; import { namespaceA } from "";
 * @Return
 */
function replaceInterfacePath(
  path: ASTPath,
  directlyImportReplacements: Map<string, TargetReplacement>,
  namespaceImportReplacements: Map<string, TargetReplacement>
): void {
  if (!path?.node?.type) {
    return;
  }
  let targetReplacement: TargetReplacement | undefined;
  if (path.node.type === "Identifier") {
    // Directly import
    targetReplacement = directlyImportReplacements.get(path.node.name);
  } else if (path.node.type === "TSQualifiedName") {
    // Import from namespace
    const interfaceTokens = visitRootTSQualifiedName(path.node);
    targetReplacement = namespaceImportReplacements.get(interfaceTokens.join("."));
  } else {
    return;
  }

  if (targetReplacement) {
    path.replace(
      buildInterfaceNode(targetReplacement.targetTokens, targetReplacement.targetTokens.length)
    );
    if (targetReplacement.importSingleExportInfo) {
      targetReplacement.importSingleExportInfo.target = targetReplacement.targetTokens[0];
    }
  }
}

/**
 * Build target interface node according to target tokens
 * @Return target interface node
 */
function buildInterfaceNode(tokens: string[], end: number): TSQualifiedName | Identifier {
  if (end > tokens.length || end <= 0 || tokens.length <= 0) {
    throw new Error(
      `Invalid input in buildTsQualifiedName. tokens: ${JSON.stringify(tokens)}, end: ${end}`
    );
  }
  const right = identifier(tokens[end - 1]);
  if (tokens.length < 2) {
    return right;
  }

  const left = end > 2 ? buildInterfaceNode(tokens, end - 1) : identifier(tokens[0]);
  return tsQualifiedName(left, right);
}

/**
 * Find the interface source tokens
 * i.e. X.Y.Z => ["X", "Y", "Z"]
 * @param node The root node of the interface
 * @Return the source tokens
 */
function visitRootTSQualifiedName(
  node: TSQualifiedName | Identifier | JSXIdentifier | TSTypeParameter
): string[] {
  const result: string[] = [];
  if (node.type === "TSQualifiedName") {
    const leftTokens = visitRootTSQualifiedName(node.left);
    const rightTokens = visitRootTSQualifiedName(node.right);
    result.push(...leftTokens, ...rightTokens);
  } else if (node.type === "Identifier") {
    result.push(node.name);
  }
  return result;
}
