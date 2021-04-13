// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { ConfigMap, NodeType, QTreeNode, OptionItem } from "fx-api";

import CLILogProvider from "../commonlib/log";
import * as constants from "../constants";
import { flattenNodes } from "../utils";

export async function validateAndUpdateAnswers(root: QTreeNode, answers: ConfigMap): Promise<void> {
  const nodes = flattenNodes(root);
  for (const node of nodes) {
    if (node.data.type === NodeType.group) {
      continue;
    }

    const ans = answers.get(node.data.name);
    if (!ans) {
      continue;
    }

    if ("returnObject" in node.data && !!node.data.returnObject) {
      const option = node.data.option;

      if (
        ans !== undefined &&
        option instanceof Array &&
        option.length > 0 &&
        typeof option[0] !== "string"
      ) {
        // adjust option is OptionItem[]
        if (ans instanceof Array) {
          const items: OptionItem[] = [];
          for (const one of ans) {
            const item = (option as OptionItem[]).filter((op) => op.label === one)[0];

            if (item) {
              items.push(item);
            } else {
              CLILogProvider.warning(
                `[${constants.cliSource}] No option for this question: ${one} ${option}`
              );
            }
          }
          answers.set(node.data.name, items);
        } else {
          const item = (option as OptionItem[]).filter((op) => op.label === ans)[0];
          if (!item) {
            CLILogProvider.warning(
              `[${constants.cliSource}] No option for this question: ${ans} ${option}`
            );
          }
          answers.set(node.data.name, item);
        }
      }
    }
  }
}
