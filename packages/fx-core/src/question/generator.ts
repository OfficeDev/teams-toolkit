// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CLICommandArgument,
  CLICommandOption,
  CLIMultiSelectOption,
  CLISingleSelectOption,
  IQTreeNode,
  MultiSelectQuestion,
  OptionValue,
  Platform,
  SingleSelectQuestion,
  UserInputQuestion,
  validate,
} from "@microsoft/teamsfx-api";
import path from "path";
import {
  IndentationText,
  OptionalKind,
  Project,
  PropertySignatureStructure,
  VariableDeclarationKind,
} from "ts-morph";
import { capabilitySubTree, createProjectQuestionNode, createSampleProjectQuestionNode } from ".";

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

async function collectNonConditional(node: IQTreeNode) {
  console.log("collectNonConditional", node.data.name, "required:", (node.data as any).required);
  if (node.children) {
    for (const child of node.children) {
      console.log(child.data.name);
      console.log("has condittion:", child.condition);
      const parentRequired = (node.data as any).required || false;
      let childRequired = (child.data as any).required || false;
      if (!childRequired) {
        if (!child.condition) {
          childRequired = true;
        } else {
          if (typeof child.condition === "function") {
            const isValid = await child.condition({
              platform: Platform.CLI_HELP,
            });
            if (isValid && parentRequired) {
              childRequired = true;
            }
          }
        }
      }
      if (childRequired) (child.data as any).required = true;
      console.log("required:", (child.data as any).required);
      await collectNonConditional(child);
    }
  }
}

export async function generate(
  node: IQTreeNode,
  name: string,
  inputsFolder = "./src/question/inputs",
  optionFolder = "./src/question/options"
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

  (node.data as any).required = true;

  await collectNonConditional(node);

  const questionNames = new Set<string>();

  const properties: OptionalKind<PropertySignatureStructure>[] = [];

  const cliOptions: CLICommandOption[] = [];
  const cliArguments: CLICommandArgument[] = [];

  for (const node of nodeList) {
    const data = node.data as UserInputQuestion;

    if (data.interactiveOnly) {
      continue;
    }
    const questionName = data.name as string;

    const cliName = data.cliName || questionName;

    if (questionNames.has(questionName)) {
      continue;
    }

    let type = "string";

    const title = data.title
      ? typeof data.title !== "function"
        ? data.title
        : await data.title({ platform: Platform.CLI_HELP })
      : undefined;
    const defaultValue = data.default
      ? typeof data.default !== "function"
        ? data.default
        : await data.default({ platform: Platform.CLI_HELP })
      : undefined;

    const propDocDescription = title || data.name;

    const option: CLICommandOption | CLICommandArgument = {
      name: cliName,
      questionName: questionName === cliName ? undefined : questionName,
      type: getOptionType(data),
      shortName: data.cliShortName,
      description: data.cliDescription || propDocDescription,
      required: data.required,
      default: data.isBoolean ? Boolean(defaultValue as any) : (defaultValue as any),
    };

    if (data.type === "singleSelect" || data.type === "multiSelect") {
      const selection = data as SingleSelectQuestion | MultiSelectQuestion;

      const options = selection.staticOptions;
      if (data.isBoolean) {
        type = "boolean";
      } else if (options.length > 0) {
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
    const inputPropName = questionName.includes("-") ? `"${questionName}"` : questionName;
    properties.push({
      name: inputPropName,
      type: type,
      hasQuestionToken: !data.required,
      docs: [`@description ${propDocDescription}`],
    });

    questionNames.add(questionName);

    if (data.cliType !== "argument") {
      cliOptions.push(option);
    } else {
      cliArguments.push(option);
    }
  }

  inputsFile.addInterface({
    name: name + "Inputs",
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

generate(capabilitySubTree(), "CreateProject");

generate(createSampleProjectQuestionNode(), "CreateSampleProject");
