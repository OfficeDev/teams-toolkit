import * as ts from "typescript";

// Copied from https://github.com/cevek/ttypescript. Because this is a ttsc compatible transformer.
interface PluginConfig {
    /**
     * Path to transformer or transformer module name
     */
    transform?: string;

    /**
     * The optional name of the exported transform plugin in the transform module.
     */
    import?: string;

    /**
     * Plugin entry point format type, default is program
     */
    type?: "program" | "config" | "checker" | "raw" | "compilerOptions";

    /**
     * Should transformer applied after all ones
     */
    after?: boolean;

    /**
     * Should transformer applied for d.ts files, supports from TS2.9
     */
    afterDeclarations?: boolean;
    /**
     * any other properties provided to the transformer as config argument
     * */
    [options: string]: any;
}

const findParent = (node: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node | undefined => {
  if (!node.parent) {
    return undefined;
  }

  if (predicate(node.parent)) {
    return node.parent;
  }

  return findParent(node.parent, predicate);
};

export default function transformer(program: ts.Program, config?: PluginConfig) {
  const transformerFactory: ts.TransformerFactory<ts.SourceFile> = context => {
    return sourceFile => {
      const visitor = (node: ts.Node): ts.Node => {
        if (ts.isExpressionStatement(node) 
              && ts.isCallExpression(node.expression) 
              && ts.isPropertyAccessExpression(node.expression.expression) 
              && node.expression.expression.expression.getText() === "failpoint"
              && node.expression.expression.name.escapedText === "inject") {
          const factory = context.factory;
          if (node.expression.arguments.length != 2) {
            throw new Error("The argument list is not of size 2");
          }
          const failpointNameExpr = node.expression.arguments[0];
          const failpointBodyExpr = node.expression.arguments[1];
          if (!ts.isArrowFunction(failpointBodyExpr)) {
            throw new Error("The failpoint body should be arrow function");
          }
          if (failpointBodyExpr.parameters.length >= 2) {
            throw new Error("Parameter list of the failpoint body should be of size 1 or 0");
          }
          let thenBlock: ts.Statement = ts.isBlock(failpointBodyExpr.body) ? failpointBodyExpr.body : factory.createExpressionStatement(failpointBodyExpr.body);
          return factory.createIfStatement(
            factory.createBinaryExpression(
              factory.createCallExpression(
                factory.createPropertyAccessExpression(
                  factory.createIdentifier("failpoint"),
                  factory.createIdentifier("evaluate")
                ),
                undefined,
                [failpointNameExpr]
              ),
              factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
              factory.createIdentifier("undefined")
            ),
            thenBlock,
            undefined
          );
        }
          
        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(sourceFile, visitor);
    };
  };
  return { before: transformerFactory };
}