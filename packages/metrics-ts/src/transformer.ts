import typescript, { ModuleKind } from "typescript";

/**
 * unused right now.
 */
export enum Reporter {
  JSON,
}

export enum Capability {
  Timer,
}

export interface PluginConfig {
  capabilities: Capability[];
  reporters: Reporter[];
}

export default function (program: typescript.Program, config?: PluginConfig) {
  const transformerFactory: typescript.TransformerFactory<typescript.SourceFile> = (
    ctx: typescript.TransformationContext
  ) => {
    return (sourceFile: typescript.SourceFile) => {
      console.log(ctx.getCompilerOptions());
      /**
       * find source file node and add "import" statements
       * TODO: check imports,
       * @see {@link https://stackoverflow.com/questions/67723545/how-to-update-or-insert-to-import-using-typescript-compiler-api}
       * TODO: can't trans to commonjs is there's no import statement of source file.
       */
      function sourfileVisitor(node: typescript.Node): typescript.Node {
        if (typescript.isSourceFile(node)) {
          const members = ["timer"];
          const myLib = "@microsoft/metrics-ts";
          return ctx.factory.updateSourceFile(node as typescript.SourceFile, [
            ctx.factory.createImportDeclaration(
              undefined,
              undefined,
              ctx.factory.createImportClause(
                false,
                undefined,
                ctx.factory.createNamedImports(
                  Array.from(members).map((name) =>
                    ctx.factory.createImportSpecifier(
                      false,
                      undefined,
                      ctx.factory.createIdentifier(name)
                    )
                  )
                )
              ),
              ctx.factory.createStringLiteral(myLib)
            ),
            ...sourceFile.statements,
          ]);
        }
        return typescript.visitEachChild(node, sourfileVisitor, ctx);
      }

      /**
       * find all methods and add metrics decorators for them
       */
      function methodVisitor(node: typescript.Node): typescript.Node {
        if (typescript.isMethodDeclaration(node)) {
          /**
           * create metric decorator for function declaration
           */
          const decorator = ctx.factory.createDecorator(
            ctx.factory.createCallExpression(ctx.factory.createIdentifier("timer"), undefined, [])
          );

          /**
           * aggragate existing decorators with new decorators
           */
          let decorators: typescript.Decorator[];
          if (node.decorators) {
            decorators = [...node.decorators, decorator];
          } else {
            decorators = [decorator];
          }

          /**
           * just update decorators, keep everything else.
           */
          return ctx.factory.updateMethodDeclaration(
            node,
            decorators,
            node.modifiers,
            node.asteriskToken,
            node.name,
            node.questionToken,
            node.typeParameters,
            node.parameters,
            node.type,
            node.body
          );
        }
        return typescript.visitEachChild(node, methodVisitor, ctx);
      }

      sourceFile = typescript.visitNode(sourceFile, sourfileVisitor);
      return typescript.visitNode(sourceFile, methodVisitor);
    };
  };

  /**
   * there're before & after hook.
   */
  return { before: transformerFactory };
}
