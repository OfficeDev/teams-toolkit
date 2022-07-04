import typescript from "typescript";

/**
 * unused right now.
 */
export enum Reporter {
  Json = "json",
}

export enum Capability {
  Timer = "timer",
}

export interface PluginConfig {
  capabilities?: Capability[];
  reporters?: Reporter[];
}

export default function (program: typescript.Program, config?: PluginConfig) {
  return (ctx: typescript.TransformationContext) => {
    return (sourceFile: typescript.SourceFile) => {
      let capabilities = [Capability.Timer];
      if (config && config.capabilities) {
        capabilities = config.capabilities;
      }

      const myLib = "@microsoft/metrics-ts";
      const myNamespace = "metrics_9527";
      /**
       * find source file node and add "import" statements
       * TODO: check imports,
       * @see {@link https://stackoverflow.com/questions/67723545/how-to-update-or-insert-to-import-using-typescript-compiler-api}
       * TODO: can't trans to commonjs is there's no import statement of source file.
       * TODO: make import name unique
       */
      function sourfileVisitor(node: typescript.Node): typescript.Node {
        if (typescript.isSourceFile(node)) {
          return ctx.factory.updateSourceFile(node as typescript.SourceFile, [
            ctx.factory.createImportDeclaration(
              undefined /** decorators */,
              undefined /** modifiers */,
              ctx.factory.createImportClause(
                false,
                undefined /** name */,
                ctx.factory.createNamespaceImport(ctx.factory.createIdentifier(myNamespace))
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
          const metricsDecorators = [];
          for (const cap of capabilities) {
            metricsDecorators.push(
              ctx.factory.createDecorator(
                ctx.factory.createCallExpression(
                  ctx.factory.createIdentifier(`${myNamespace}.${cap}`),
                  undefined,
                  []
                )
              )
            );
          }

          /**
           * aggragate existing decorators with new decorators
           */
          let decorators: typescript.Decorator[];
          if (node.decorators) {
            decorators = [...node.decorators, ...metricsDecorators];
          } else {
            decorators = metricsDecorators;
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
}
