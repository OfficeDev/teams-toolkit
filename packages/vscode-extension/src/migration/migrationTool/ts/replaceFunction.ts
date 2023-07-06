import {
  ASTPath,
  CommentLine,
  identifier,
  Identifier,
  JSCodeshift,
  CallExpression,
  MemberExpression,
  memberExpression,
} from "jscodeshift";
import type { ExpressionKind } from "ast-types/gen/kinds";
import { Collection } from "jscodeshift/src/Collection";
import { FunctionReplacement, TargetFunctionReplacement } from "./replacement";
import { buildFunctionReplacement, buildTargetReplacement } from "./replacementsGenerator";
import { ImportInfo } from "./importInfo";
import { CommentMessages } from "../../constants";

/**
 * This function is replace the function call
 * @param j JSCodeshift
 * @param root The root of AST tree
 * @param importInfo The import module source, alias and target
 */
export function replaceFunction(
  j: JSCodeshift,
  root: Collection<any>,
  importInfo: ImportInfo
): void {
  const replacements: FunctionReplacement[] = buildFunctionReplacement();
  const [directlyImportReplacements, namespaceImportReplacements] = buildTargetReplacement(
    importInfo,
    replacements
  );

  // find all of CallExpression Paths
  const callExpressionPaths: Collection<CallExpression> = root.find(CallExpression);
  callExpressionPaths.forEach((path) => {
    // Get callee path
    const typeNamePath = path.get("callee");

    // Find out the matched replacement rule of callee
    const targetReplacement = findTargetReplacement(
      typeNamePath,
      directlyImportReplacements,
      namespaceImportReplacements
    );
    if (targetReplacement) {
      // Add comments for callback to promise function
      if (
        targetReplacement.callbackToPromise &&
        path.node.arguments.length > targetReplacement.callbackPosition
      ) {
        addComment(
          path,
          j.commentLine(CommentMessages.APIWithCallbackChangedToPromise, true, false)
        );
        if (
          targetReplacement.sourceTokens[targetReplacement.sourceTokens.length - 1] === "getContext"
        ) {
          addComment(path, j.commentLine(CommentMessages.ContextSchemaChanged, true, false));
        }
      }
      // Replace the function node
      typeNamePath.replace(buildMethodASTNode([...targetReplacement.targetTokens]));
      // Mark changed import info
      if (targetReplacement.importSingleExportInfo) {
        targetReplacement.importSingleExportInfo.target = targetReplacement.targetTokens[0];
      }
    }
  });
}

/**
 * Find out the matched replacement rule of callee
 * @param path callee path
 * @param directlyImportReplacements the replacement map of directly import
 * @param namespaceImportReplacements the replacement map of import in namespace
 * @returns Return the matched rule or return undefined if there is no matching rules
 * i.e directlyImportReplacements: { "getContext": Replacement1, "other": Replacement2 }
 *     namespaceImportReplacements: { "msft.getContext": Replacement3, "msft.other": Replacement4 }
 *     path: getContext() -> return: Replacement1
 *     path: nofound() -> return: undefined
 *     path: msft.notfound() -> return: undefined
 *     path: msft.getContext() -> return: Replacement3
 */
function findTargetReplacement(
  path: ASTPath,
  directlyImportReplacements: Map<string, TargetFunctionReplacement>,
  namespaceImportReplacements: Map<string, TargetFunctionReplacement>
): TargetFunctionReplacement | undefined {
  if (!path?.node?.type) {
    return;
  }
  let targetReplacement = undefined;
  if (path.node.type === "Identifier") {
    // Directly import
    targetReplacement = directlyImportReplacements.get(path.node.name);
  } else if (
    path.node.type === "MemberExpression" ||
    path.node.type === "OptionalMemberExpression"
  ) {
    // Import from namespace
    const interfaceTokens = visitRootMemberExpression(path.node);
    targetReplacement = namespaceImportReplacements.get(interfaceTokens.join("."));
  }
  return targetReplacement;
}

/**
 * Build a MemberExpression according to target tokens
 * @param tokens the node names of the MemberExpression
 * @returns Return the root MemberExpression
 * i.e tokens: ["microsoftTeams", "app", "getContext"] -> return microsoftTeams.app.getContext
 */
function buildMethodASTNode(tokens: Array<string>): MemberExpression | Identifier {
  let node: MemberExpression | Identifier;
  if (tokens.length == 0) {
    throw Error(`Invalid input in buildMethodASTNode. tokens: ${JSON.stringify(tokens)}`);
  }

  if (tokens.length == 1) {
    node = identifier(String(tokens.pop()));
  } else {
    const property: string | undefined = tokens.pop();
    node = memberExpression(buildMethodASTNode(tokens), identifier(String(property)));
  }
  return node;
}

/**
 * Visit all the tokens in a root MemberExpression
 * @param node root MemberExpression
 * @returns Return the array of node names
 * i.e node: msft.getContext() -> return ["msft", "getContext"]
 *     node: getContext() -> return ["getContext"]
 */
function visitRootMemberExpression(node: ExpressionKind | Identifier): string[] {
  const result: string[] = [];
  if (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") {
    const leftTokens = visitRootMemberExpression(node.object);
    const rightTokens = visitRootMemberExpression(node.property);
    result.push(...leftTokens, ...rightTokens);
  } else if (node.type === "Identifier") {
    result.push(node.name);
  }
  return result;
}

/**
 * Add comment to previous line.
 * @param path the expression path
 * @param comment the comment to add
 */
function addComment(path: ASTPath, comment: CommentLine): void {
  let node: any = path.node;
  const startLine = node.loc?.start?.line;
  if (startLine !== undefined) {
    // locate the current line's statement
    while (path.parent !== undefined) {
      node = path.node;
      path = path.parent;
      if ((path.node as any).loc?.start?.line !== startLine) {
        break;
      }
    }
  }

  if (node.comments === undefined) {
    node.comments = [comment];
  } else {
    node.comments.push(comment);
  }
}
