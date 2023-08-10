// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  IQTreeNode,
  MultiSelectQuestion,
  OptionItem,
  QTreeNode,
  Question,
  SingleSelectQuestion,
  StaticOptions,
  validate,
} from "@microsoft/teamsfx-api";
import { isAutoSkipSelect } from "@microsoft/teamsfx-core";
import { Options } from "yargs";
import { getSingleOptionString, toYargsOptions } from "./utils";
import { globals } from "./globals";

export async function filterQTreeNode(
  root: QTreeNode,
  key: string,
  value: any
): Promise<QTreeNode> {
  /// finds the searched node
  let searchedNode: QTreeNode | undefined = undefined;
  const parentMap = new Map<QTreeNode, QTreeNode>();
  const stack = [root];
  while (stack.length > 0) {
    const currentNode = stack.pop();
    if (currentNode?.data.name === key) {
      searchedNode = currentNode;
      break;
    }
    if (currentNode?.children) {
      currentNode.children.forEach((node) => {
        parentMap.set(node, currentNode);
        stack.push(node);
      });
    }
  }
  /// if not searched, return the original tree
  if (!searchedNode || searchedNode.data.type === "group") return root;

  /// checks the answer is valid
  const searchedNodeAns = await calculateByGivenAns(searchedNode.data, value);
  /// if invalid, return the original tree
  if (searchedNodeAns === undefined) return root;
  searchedNode.data.value = searchedNodeAns;
  (searchedNode.data as any).hide = true;

  /// gets the children which conditions match the parent's answer
  const matchedChildren: QTreeNode[] = [];
  if (searchedNode.children) {
    for (const child of searchedNode.children) {
      if (child && child.condition) {
        const validRes = await validate(child.condition, searchedNodeAns);
        if (validRes === undefined) {
          matchedChildren.push(child);
        }
      }
    }
    searchedNode.children = matchedChildren;
  }

  return root;
}

async function calculateByGivenAns(ques: Question, ans: any, caseSensitive = false) {
  switch (ques.type) {
    case "multiSelect":
      if (!Array.isArray(ans)) return undefined;
      let matchedOptions = ans
        .map((s) => getMatchedOption(ques.staticOptions, s, caseSensitive))
        .filter((op) => op) as StaticOptions;
      let matchedIds = matchedOptions.map((op) => getOptionId(op, false));
      if (ques.onDidChangeSelection) {
        /// run onDidChangeSelection for changing the answer
        matchedIds = Array.from(
          await ques.onDidChangeSelection(new Set<string>(matchedIds), new Set<string>())
        );
        matchedOptions = matchedIds
          .map((s) => getMatchedOption(ques.staticOptions, s, caseSensitive))
          .filter((op) => !op) as StaticOptions;
      }
      return ques.returnObject ? matchedOptions : matchedIds;
    case "singleSelect":
      if (typeof ans !== "string") return undefined;
      const matchedOption = getMatchedOption(ques.staticOptions, ans, caseSensitive);
      return ques.returnObject || !matchedOption
        ? matchedOption
        : getOptionId(matchedOption, false);
    case "text":
      return ans;
    default:
      throw Error("Not supported question's type");
  }
}

function getMatchedOption(options: StaticOptions, value: string, caseSensitive = false) {
  const newValue = caseSensitive ? value : value.toLocaleLowerCase();
  const ids = options.map((op) => getOptionId(op, !caseSensitive));
  const cliNames = options.map((op) => getOptionCliName(op, !caseSensitive));
  const index = ids.includes(newValue)
    ? ids.findIndex((id) => id === newValue)
    : cliNames.findIndex((name) => name === newValue);
  if (index > -1) {
    return options[index];
  }
  return undefined;
}

function getOptionId(option: string | OptionItem, toLocaleLowerCase = true) {
  const id = typeof option === "string" ? option : option.id;
  return toLocaleLowerCase ? id.toLocaleLowerCase() : id;
}

function getOptionCliName(option: string | OptionItem, toLocaleLowerCase = true) {
  const cliName = typeof option === "string" ? option : option.cliName;
  return toLocaleLowerCase ? cliName?.toLocaleLowerCase() : cliName;
}

export async function toYargsOptionsGroup(nodes: IQTreeNode[]) {
  const nodesWithoutGroup = nodes.filter((node) => node.data.type !== "group");
  const params: { [_: string]: Options } = {};
  globals.options = [];
  for (const node of nodesWithoutGroup) {
    const data = node.data as Question;
    if (isAutoSkipSelect(data)) {
      // set the only option to default value so yargs will auto fill it.
      data.default = getSingleOptionString(data as SingleSelectQuestion | MultiSelectQuestion);
      (data as any).hide = true;
    }
    params[data.name] = await toYargsOptions(data);
    globals.options.push(data.name);
  }
  return params;
}
