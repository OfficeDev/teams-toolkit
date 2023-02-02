// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @fileoverview auto add jsdoc author
 * @author Long Hao <haolong@microsoft.com>
 */
"use strict";

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const childProcess = require("child_process");

module.exports = {
  "jsdoc-author": {
    meta: {
      type: "layout",
      fixable: "code",
      docs: {
        description: "save @author JSDoc according to git history",
        recommended: false,
      },
      schema: [],
    },
    create: (context) =>
      /\.ts$/.test(context.getFilename())
        ? {
            Program: (node) => {
              let command = `git log --reverse --format="%aN" ${context.getFilename()}  | head -1 `;
              let author = (0, childProcess.execSync)(command, {
                encoding: "utf8",
              });

              command = `git log --reverse --format="%aE" ${context.getFilename()}  | head -1 `;
              let email = (0, childProcess.execSync)(command, {
                encoding: "utf8",
              });

              if (author === "") {
                command = "git config user.name";
                author = (0, childProcess.execSync)(command, {
                  encoding: "utf8",
                });
              }

              if (email === "") {
                command = "git config user.email";
                email = (0, childProcess.execSync)(command, {
                  encoding: "utf8",
                });
              }
              const authorJSDoc = `/**\n * @author ${author.trim()} <${email.trim()}>\n */\n`;
              console.log(authorJSDoc);
              const headerComments = context
                .getSourceCode()
                .getCommentsBefore(node);
              if (
                headerComments.length === 0 ||
                headerComments.every(
                  (comment) => !comment.value.includes("@author")
                )
              ) {
                context.report({
                  node: node,
                  message: "no @author header found",
                  fix: (fixer) => fixer.insertTextBefore(node, authorJSDoc),
                });
              }
            },
          }
        : {},
  },
};
