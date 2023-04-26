// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Huajie Zhang <huajiezhasng@microsoft.com>
 */
"use strict";

const { getStringIfConstant} = require("eslint-utils");

const path = require("path");

const fs = require("fs");

const os = require("os");

const keyFilePath = path.resolve(os.tmpdir(), "allLiterals.txt");

fs.unlink(keyFilePath, (err) => {
});
 
function collectKey(key) {
  if (key && key.trim()) {
    fs.appendFile(keyFilePath, '\n' + key.trim(), (err) => {
      if (err) throw err;
      console.log(`The line "${key}" was appended to file "${keyFilePath}"`);
    });
  }
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  "collect-localized-strings": {
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
        return {
          CallExpression: function(node) {
            if(node.arguments) {
              const argNode = node.arguments[0];
              if(argNode) {
                if (argNode.type === "Literal") {
                  const key = argNode.value;
                  collectKey(key);
                } else if(argNode.type && argNode.type === "TemplateLiteral") {
                  const key = getStringIfConstant(argNode, context);
                  collectKey(key);
                }
              }
            }
          },
          Literal: function(node) {
            const key = node.value;
            collectKey(key);
          },
          TemplateLiteral: function(node) {
            const key = getStringIfConstant(node, context);
            collectKey(key);
          },
        };
      } else {
        return {}
      }
    }
  }
};
