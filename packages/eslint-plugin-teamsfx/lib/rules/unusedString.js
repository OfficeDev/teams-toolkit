// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Huajie Zhang <huajiezhasng@microsoft.com>
 */
"use strict";

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  "unused-string": {
    meta: {
      type: "problem",
      docs: {
        description: "check if all keys in resource/package.nls.json are used in TypeScript code",
        category: "Possible Errors",
        recommended: true
      },
      schema: [
        {
          type: "object",
          properties: {
            jsonFilePath: {
              type: "string"
            }
          },
          additionalProperties: false
        }
      ]
    },
  
    create(context) {
      const jsonFilePath = context.options[0].jsonFilePath;
      const keys = require(jsonFilePath);
  
      function reportUnusedKeys() {
        Object.keys(keys).forEach((key) => {
          const variable = context.getScope().variables.find((v) => v.name === key);
  
          if (!variable) {
            context.report({
              loc: { line: 0, column: 0 },
              message: `The key '${key}' in '${jsonFilePath}' is not used in any TypeScript code.`
            });
          }
        });
      }
  
      return {
        "Program:exit": reportUnusedKeys
      };
    }
  }
};