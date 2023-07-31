// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CLICommandArgument,
  CLICommandOption,
  IQTreeNode,
  UserInputQuestion,
  CLISingleSelectOption,
  CLIMultiSelectOption,
  SingleSelectQuestion,
  MultiSelectQuestion,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { camelCase } from "lodash";
import path from "path";
import { addWebPartQuestionNode } from "./other";
import { createProjectQuestionNode } from ".";
import {
  IndentationText,
  Project,
  StructureKind,
  OptionalKind,
  VariableDeclarationKind,
  PropertySignatureStructure,
} from "ts-morph";

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
  if (node.data.type !== "group") {
    if (!node.condition && (node.data as UserInputQuestion).required === undefined) {
      (node.data as UserInputQuestion).required = true;
    }
  }
  if (node.children) {
    for (const child of node.children) {
      if (!child.condition) collectNonConditional(child);
    }
  }
}

export function generate(
  node: IQTreeNode,
  name: string,
  inputsFolder = "./inputs",
  optionFolder = "./options"
) {
  // initialize
  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces, // Set the indentation to 2 spaces
    },
  });

  const inputsFile = project.createSourceFile(path.join(inputsFolder, `${name}Inputs.ts`), "", {
    overwrite: true,
  });

  const optionFile = project.createSourceFile(path.join(optionFolder, `${name}Options.ts`), "", {
    overwrite: true,
  });

  const nodeList: IQTreeNode[] = [];

  collect(node, nodeList);

  collectNonConditional(node);

  const propertySet = new Set<string>();

  const properties: OptionalKind<PropertySignatureStructure>[] = [];

  const cliOptions: CLICommandOption[] = [];
  const cliArguments: CLICommandArgument[] = [];

  for (const node of nodeList) {
    const data = node.data as UserInputQuestion;

    if (data.interactiveOnly) {
      continue;
    }

    const propName = camelCase(node.data.name);

    if (propertySet.has(propName)) {
      continue;
    }

    let type = "string";

    const description =
      typeof data.title === "string"
        ? data.title
        : undefined || (data as any).placeholders || data.name;

    const cliName = data.cliName || data.name;
    const option: CLICommandOption | CLICommandArgument = {
      name: cliName,
      type: getOptionType(data),
      shortName: data.cliShortName,
      description: data.cliDescription || description,
      required: data.required,
    };

    if (data.type === "singleSelect" || data.type === "multiSelect") {
      const selection = data as SingleSelectQuestion | MultiSelectQuestion;

      const options = selection.staticOptions;
      if (options.length > 0 && !selection.dynamicOptions) {
        const optionStrings = options.map((o) => (typeof o === "string" ? o : o.id));
        type = optionStrings.map((i) => `"${i}"`).join(" | ");
        (option as CLISingleSelectOption).choices = optionStrings;
      } else {
        type = "string";
      }

      if (data.type === "multiSelect") {
        type += "[]";
      }

      (option as CLISingleSelectOption | CLIMultiSelectOption).choiceListCommand =
        selection.cliChoiceListCommand;
    }

    properties.push({
      name: propName,
      type: type,
      hasQuestionToken: !data.required,
      docs: [`@description ${description}`],
    });

    propertySet.add(propName);

    if (data.cliType !== "argument") {
      cliOptions.push(option);
    } else {
      cliArguments.push(option);
    }
  }

  inputsFile.addInterface({
    name: name,
    isExported: true,
    properties: properties,
    extends: ["Inputs"],
  });

  inputsFile.addImportDeclaration({
    namedImports: ["Inputs"],
    moduleSpecifier: "@microsoft/teamsfx-api",
  });

  const optionInitializerCode = JSON.stringify(cliOptions, null, 2)
    .replace(/"([^"]+)":/g, "$1:")
    .replace(/\\"/g, '"')
    .replace(/\n}$/g, ",\n}");

  // const optionInitializerCode = cliOptions
  //   .map((obj) => JSON.stringify(obj, null, 2).replace(/\n}$/g, ",\n}"))
  //   .join(",\n");

  const argumentInitializerCode = JSON.stringify(cliArguments, null, 2)
    .replace(/"([^"]+)":/g, "$1:")
    .replace(/\\"/g, '"');
  optionFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    isExported: true,
    declarations: [
      {
        name: name + "Options",
        type: "CLICommandOption[]",
        initializer: optionInitializerCode,
      },
    ],
  });
  optionFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    isExported: true,
    declarations: [
      {
        name: name + "Arguments",
        type: "CLICommandArgument[]",
        initializer: argumentInitializerCode,
      },
    ],
  });
  optionFile.addImportDeclaration({
    namedImports: ["CLICommandOption", "CLICommandArgument"],
    moduleSpecifier: "@microsoft/teamsfx-api",
  });
  inputsFile.insertText(
    0,
    "// Copyright (c) Microsoft Corporation.\n// Licensed under the MIT license.\n\n"
  );
  optionFile.insertText(
    0,
    "// Copyright (c) Microsoft Corporation.\n// Licensed under the MIT license.\n\n"
  );
  inputsFile.formatText();
  optionFile.formatText();
  project.saveSync();
}

function getOptionType(
  question: UserInputQuestion
): "text" | "boolean" | "singleSelect" | "multiSelect" {
  if (question.isBoolean) return "boolean";
  if (question.type === "multiSelect") {
    return "multiSelect";
  } else if (question.type === "singleSelect") {
    return "singleSelect";
  }
  return "text";
}

generate(createProjectQuestionNode(), "CreateProject");

generate(addWebPartQuestionNode(), "SPFxAddWebpart");
