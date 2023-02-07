// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @fileoverview auto add metrics for each method
 * @author Long Hao <haolong@microsoft.com>
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------
let metricsImportCount = 0;

module.exports = {
  metrics: {
    meta: {
      fixable: "code",
      docs: {
        description: "auto add metrics decorators for each method",
        category: "Possible Errors",
        recommended: false,
      },
      schema: [],
    },
    create(context) {
      return {
        ImportDeclaration(node) {
          if (node.source.value.includes("@microsoft/metrics-ts")) {
            metricsImportCount++;
          }
        },
        "Program:exit": function (node) {
          if (metricsImportCount === 0) {
            context.report({
              node,
              message: "auto import timer",
              fix: (fixer) =>
                fixer.insertTextBefore(
                  node,
                  `import { MSTimer } from "@microsoft/metrics-ts"\n`
                ),
            });
          }
          metricsImportCount = 0;
        },

        MethodDefinition(node) {
          if (node.key.name === "constructor") {
            return;
          }

          if (node.value.body === null) {
            return;
          }

          if (node.kind !== "method") {
            return;
          }

          let exist = false;
          if (node.decorators) {
            for (const d of node.decorators) {
              if (d.expression.callee.name === "MSTimer") {
                exist = true;
                break;
              }
            }
          }
          if (!exist) {
            context.report({
              node,
              message: "auto add timer",
              fix: (fixer) =>
                fixer.insertTextBefore(node, "@MSTimer(__filename)\n"),
            });
          }
        },
      };
    },
  },
};
