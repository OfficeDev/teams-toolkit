// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Huajie Zhang <huajiezhasng@microsoft.com>
 */
"use strict";

const { getStringIfConstant} = require("eslint-utils");
 
let allKeys;

function matchKey(key) {
  if (key) {
    if (allKeys.has(key)) {
      console.log("Found key:" + key);
      allKeys.delete(key);
    }
  }
}

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
      if (/\.ts$/.test(context.getFilename())) {
        console.log("Checking unused strings in " + context.getFilename());
        const jsonFilePath = context.options[0].jsonFilePath;
        const json = require(jsonFilePath);
        const keys = Object.keys(json);
        if (!allKeys) allKeys = new Set(keys.filter(k=>!k.startsWith("_")));
        return {
          CallExpression: function(node) {
            if(node.arguments) {
              const argNode = node.arguments[0];
              if(argNode) {
                if (argNode.type === "Literal") {
                  const key = argNode.value;
                  matchKey(key);
                } else if(argNode.type && argNode.type === "TemplateLiteral") {
                  const key = getStringIfConstant(argNode, context);
                  matchKey(key);
                }
              }
            }
          },
          Literal: function(node) {
            const key = node.value;
            matchKey(key);
          },
          TemplateLiteral: function(node) {
            const key = getStringIfConstant(node, context);
            matchKey(key);
          },
          "Program:exit": function (node) {
            if (allKeys.size > 0) {
              let displayArray = Array.from(allKeys);
              if (displayArray.length > 10) {
                displayArray = displayArray.slice(0, 10);
                displayArray.push("...");
              }
              context.report({
                node: node,
                message: `The following ${allKeys.size} message keys in '${jsonFilePath}' are not referenced:\n ${displayArray.join(',')}`,
              });
            }
          }
        };
      } else {
        return {}
      }
    }
  }
};
