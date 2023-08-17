// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @fileoverview auto add jsdoc author
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
              let command = `git log --reverse --format="%aN" -1 ${context.getFilename()}`;
              let author = (0, childProcess.execSync)(command, {
                encoding: "utf8",
              });

              command = `git log --reverse --format="%aE" -1 ${context.getFilename()}`;
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
