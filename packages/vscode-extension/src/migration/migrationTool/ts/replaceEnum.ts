// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { JSCodeshift, Collection, Identifier, ASTPath, identifier } from "jscodeshift";
import { ImportInfo } from "./importInfo";
import { Replacement, TargetReplacement } from "./replacement";
import { buildReplacement, buildTargetReplacement } from "./replacementsGenerator";

export function replaceEnum(j: JSCodeshift, root: Collection<any>, importInfo: ImportInfo) {
  const alias = new Set<string>();
  if (importInfo.importEntireModuleInfo.length > 0) {
    importInfo.importEntireModuleInfo.forEach((item) => {
      alias.add(item.alias);
    });
  }
  if (importInfo.importSingleExportInfo.length > 0) {
    importInfo.importSingleExportInfo.forEach((item) => {
      alias.add(item.alias ?? item.source);
    });
  }
  const replacements: Replacement[] = buildReplacement("enumMappings");
  const [directlyImportReplacements, namespaceImportReplacements] = buildTargetReplacement(
    importInfo,
    replacements
  );
  const needReplaceEnum: Set<string> = new Set<string>();
  const replaceImportMap: Map<string, string> = new Map<string, string>();
  replacements.forEach((item) => {
    needReplaceEnum.add(item.sourceTokens[item.sourceTokens.length - 1]);
    replaceImportMap.set(item.sourceTokens[0], item.targetTokens[0]);
  });

  /**
   * find all need replaced enum
   */
  const teamsClientSDKEnumPaths: Collection<Identifier> = root
    .find(Identifier)
    .filter((p) => isEnumInGivenNamespaces(p, needReplaceEnum));
  teamsClientSDKEnumPaths.forEach((path) => {
    // skip non import from teams-js node
    let skipReplace = false;
    if (alias.size > 0) {
      const leftName = getLeftName(path);
      if (!alias.has(leftName)) {
        skipReplace = true;
      }
    }
    if (!skipReplace) {
      replaceEnumPath(
        path,
        directlyImportReplacements,
        namespaceImportReplacements,
        replacements,
        importInfo
      );
    }
  });

  importInfo.importSingleExportInfo.forEach((info) => {
    if (info.source && replaceImportMap.has(info.source)) {
      info.target = replaceImportMap.get(info.source)!;
      delete info.alias;
    }
  });
}

/**
 * check whether this path has an enum need to be replaced
 * @param p AST node path to identifier node
 * @param namespacesImported a set of namespaces that are imported from import declaration
 * @returns a boolean value if the node has the namespace in the set
 */
function isEnumInGivenNamespaces(p: ASTPath<Identifier>, needReplaceEnum: Set<string>): boolean {
  return (
    needReplaceEnum.has(p.node.name) &&
    (p.parent.node.type === "MemberExpression" || p.parent.node.type === "TSQualifiedName")
  );
}

/**
 * Replace the enum node according to replacement rules
 * @param path The enum root path.
 * @param directlyImportReplacements The mapping of interface directly imported. i.e. import { interfaceA } from "";
 * @param namespaceImportReplacements The mapping of interface in namespace. i.e. import * as msft from ""; import { namespaceA } from "";
 * @Return
 */
function replaceEnumPath(
  path: ASTPath,
  directlyImportReplacements: Map<string, TargetReplacement>,
  namespaceImportReplacements: Map<string, TargetReplacement>,
  replacements: Replacement[],
  importInfo: ImportInfo
): void {
  if (!path?.node?.type) {
    return;
  }
  let targetReplacement: TargetReplacement | undefined;
  if (path.node.type === "Identifier") {
    replacements.forEach((item) => {
      if (item.sourceTokens[item.sourceTokens.length - 1] === (path.node as any).name) {
        targetReplacement = namespaceImportReplacements.get(item.sourceTokens.join("."));
      }
    });
  } else {
    return;
  }

  if (targetReplacement) {
    if (path.parent.node.type === "MemberExpression") {
      path.parent.node.object = identifier(targetReplacement.targetTokens[0]);
    } else if (path.parent.node.type === "TSQualifiedName") {
      path.parent.node.left = identifier(targetReplacement.targetTokens[0]);
    }
    if (targetReplacement.importSingleExportInfo) {
      targetReplacement.importSingleExportInfo.target = targetReplacement.targetTokens[0];
    }
  } else {
    let importFromEntire = false;
    if (importInfo.importEntireModuleInfo.length > 0) {
      const leftName = getLeftName(path);
      importInfo.importEntireModuleInfo.forEach((item) => {
        if (item.alias === leftName) {
          importFromEntire = true;
        }
      });
    }
    if (importFromEntire) {
      // ie: c.appInitialization.FailedReason;
      replacements.forEach((item) => {
        if (path.parent.node.type === "MemberExpression") {
          if (item.sourceTokens[item.sourceTokens.length - 1] === (path.node as any).name) {
            if (item.sourceTokens.length == 1) {
              (path.node as any).name = item.targetTokens[0];
            } else {
              path.parent.node.object.property.name = item.targetTokens[0];
            }
          }
        } else if (path.parent.node.type === "TSQualifiedName") {
          if (item.sourceTokens[item.sourceTokens.length - 1] === (path.node as any).name) {
            if (item.sourceTokens.length == 1) {
              (path.node as any).name = item.targetTokens[0];
            } else {
              path.parent.node.left.right.name = item.targetTokens[0];
            }
          }
        }
      });
    } else {
      // ie: b.FailedReason.Other;
      replacements.forEach((item) => {
        if (item.sourceTokens[item.sourceTokens.length - 1] === (path.node as any).name) {
          if (item.sourceTokens.length == 1) {
            (path.node as any).name = item.targetTokens[0];
          } else {
            if (path.parent.node.type === "MemberExpression") {
              path.parent.node.object = identifier(item.targetTokens[0]);
            } else if (path.parent.node.type === "TSQualifiedName") {
              path.parent.node.left = identifier(item.targetTokens[0]);
            }
          }
        }
      });
    }
  }
}

function getLeftName(path: ASTPath) {
  let leftName = "";
  if (path.parent.node.type === "MemberExpression") {
    let leftObject = path.parent.node.object;
    while (leftObject.object) {
      leftObject = leftObject.object;
    }
    leftName = leftObject.name;
  } else if (path.parent.node.type === "TSQualifiedName") {
    let leftNode = path.parent.node.left;
    while (leftNode.left != null) {
      leftNode = leftNode.left;
    }
    leftName = leftNode.name;
  }
  return leftName;
}
