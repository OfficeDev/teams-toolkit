// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { IQTreeNode, UserInputQuestion } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { camelCase } from "lodash";
import path from "path";
import { addWebPartQuestionNode } from "./other";
import { createProjectQuestionNode } from ".";

function collect(node: IQTreeNode, nodeList: IQTreeNode[]) {
  if (node.data.type !== "group") {
    nodeList.push(node);
  }
  if (node.children) {
    for (const child of node.children) {
      collect(child, nodeList);
    }
  }
}

function collectNonConditional(node: IQTreeNode) {
  console.log(`collectNonConditional: ${node.data.name}`);
  if (node.data.type !== "group") {
    if (!node.condition) {
      (node.data as UserInputQuestion).required = true;
    }
  }
  if (node.children) {
    for (const child of node.children) {
      if (!child.condition) collectNonConditional(child);
    }
  }
}

export function generate(node: IQTreeNode, name: string, folder = "./inputs") {
  const nodeList: IQTreeNode[] = [];

  collect(node, nodeList);

  collectNonConditional(node);

  let lines: string[] = [
    "// Copyright (c) Microsoft Corporation.\n// Licensed under the MIT license.\n",
  ];

  lines.push(`export interface ${name} {`);

  let properties: string[] = [];

  const propertySet = new Set<string>();

  for (const node of nodeList) {
    const data = node.data as any;

    if ((node.data as UserInputQuestion).interactiveOnly) {
      continue;
    }

    const propName = camelCase(node.data.name);

    if (propertySet.has(propName)) {
      continue;
    }

    properties = properties.concat([
      "/**",
      ` * @description: ${
        typeof data.title === "string" ? data.title : undefined || data.placeholders || data.name
      }`,
      " */",
    ]);
    const requiredFlag = (node.data as UserInputQuestion).required ? "" : "?";
    let type = "string";

    if (node.data.type === "singleSelect") {
      const options = node.data.staticOptions;
      if (options.length > 0 && !node.data.dynamicOptions) {
        type = options.map((o) => `"${typeof o === "string" ? o : o.id}"`).join(" | ");
      } else {
        type = "string";
      }
    } else if (node.data.type === "multiSelect") {
      const options = node.data.staticOptions;
      if (options.length > 0 && !node.data.dynamicOptions) {
        type =
          "(" + options.map((o) => `"${typeof o === "string" ? o : o.id}"`).join(" | ") + ")[]";
      } else {
        type = "string[]";
      }
    }

    properties.push(propName + requiredFlag + `: ${type};`);

    propertySet.add(propName);
  }

  properties = properties.map((l) => "  " + l);

  lines = lines.concat(properties);

  lines.push("}\n");

  fs.writeFileSync(path.resolve(folder, name + ".ts"), lines.join("\n"));
}

generate(createProjectQuestionNode(), "CreateProject");

generate(addWebPartQuestionNode(), "SPFxAddWebpart");
