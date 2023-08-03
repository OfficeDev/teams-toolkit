// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CLIArrayOption,
  CLICommandArgument,
  CLICommandOption,
  CLIOptionType,
  CLIStringOption,
  IQTreeNode,
  MultiSelectQuestion,
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
  SyntaxKind,
  VariableDeclarationKind,
} from "ts-morph";
import { questionNodes } from ".";

async function collect(node: IQTreeNode, nodeList: IQTreeNode[]) {
  if (node.interactiveOnly === "all") return;
  if (node.data.type !== "group" && (!node.interactiveOnly || node.interactiveOnly !== "self")) {
    nodeList.push(node);
  }
  let currentOptions: string[] = [];
  if (node.data.type === "singleSelect" || node.data.type === "multiSelect") {
    currentOptions = (node.data as SingleSelectQuestion | MultiSelectQuestion).staticOptions.map(
      (option) => (typeof option === "string" ? option : option.id)
    );
  }
  if (node.children && (!node.interactiveOnly || node.interactiveOnly !== "children")) {
    for (const child of node.children) {
      if (child.condition && typeof child.condition !== "function" && currentOptions.length > 0) {
        // try to exclude one case: parent value has a range, child condition is not functional condition,
        // and none of the value in the range satisfies the condition
        let someChoiceIsValid = false;
        for (const parentValue of currentOptions) {
          const res = await validate(child.condition, parentValue);
          if (res === undefined) {
            someChoiceIsValid = true;
            break;
          }
        }
        if (someChoiceIsValid) {
          await collect(child, nodeList);
        }
        // if all choices are invalid, trim the child node
      } else {
        await collect(child, nodeList);
      }
    }
  }
}

async function computeRequired(node: IQTreeNode) {
  // console.log("computeRequired", node.data.name, "required:", (node.data as any).required);
  if (node.children) {
    const parentRequired = (node.data as any).required || false;
    for (const child of node.children) {
      let childRequired = (child.data as any).required || false;
      if (!childRequired) {
        if (!child.condition && parentRequired) {
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
      // console.log(
      //   child.data.name,
      //   "parent required:",
      //   parentRequired,
      //   "child required:",
      //   (child.data as any).required,
      //   "child condition:",
      //   child.condition,
      //   "computed required:",
      //   (child.data as any).required
      // );
      await computeRequired(child);
    }
  }
}

export async function generate(
  node: IQTreeNode,
  name: string,
  inputsFolder = "./src/question/inputs",
  optionFolder = "./src/question/options",
  excludes = ["folder"]
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

  await collect(node, nodeList);

  // console.log(`node collected: ${nodeList.map((n) => n.data.name).join(",")}`);

  (node.data as any).required = true;

  await computeRequired(node);

  const questionNames = new Set<string>();

  const properties: OptionalKind<PropertySignatureStructure>[] = [];

  const cliOptions: CLICommandOption[] = [];
  const cliArguments: CLICommandArgument[] = [];

  for (const node of nodeList) {
    const data = node.data as UserInputQuestion;

    const questionName = data.name as string;

    const cliName = data.cliName || questionName;

    if (excludes.includes(cliName)) continue;

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
        (option as CLIStringOption | CLIArrayOption).choices = optionStrings;
      } else {
        type = "string";
      }

      if (data.type === "multiSelect") {
        type += "[]";
      }

      (option as CLIStringOption | CLIArrayOption).choiceListCommand =
        selection.cliChoiceListCommand;
    }
    const inputPropName = questionName.includes("-") ? `"${questionName}"` : questionName;
    properties.push({
      name: inputPropName,
      type: type,
      hasQuestionToken: true,
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

  await updateExports("./src/question/options/index.ts", `export * from "./${name}Options";`);

  await updateExports("./src/question/inputs/index.ts", `export * from "./${name}Inputs";`);

  await project.save();
}

function getOptionType(question: UserInputQuestion): CLIOptionType {
  if (question.isBoolean) return "boolean";
  if (question.type === "multiSelect") {
    return "array";
  }
  return "string";
}

async function updateExports(filePath: string, exportStatement: string) {
  const project = new Project();
  try {
    const sourceFile = await project.addSourceFileAtPathIfExists(filePath);
    if (!sourceFile) return;
    const hasExport = sourceFile.getStatements().some((statement) => {
      // console.log(`statement.getText().trim(): ${statement.getText().trim()}`);
      return (
        statement.getKind() === SyntaxKind.ExportDeclaration &&
        statement.getText().trim() === exportStatement
      );
    });

    if (!hasExport) {
      sourceFile.addStatements([exportStatement]);
      await sourceFile.save();
      console.log(`Export statement '${exportStatement}' added successfully.`);
    }
  } catch (err) {
    console.error("Error occurred:", err);
    return;
  }
}

async function batchGenerate() {
  await generate(questionNodes.createProject(), "CreateProject");
  await generate(questionNodes.createSampleProject(), "CreateSampleProject");
  await generate(questionNodes.addWebpart(), "SFPxAddWebpart");
  await generate(questionNodes.createNewEnv(), "CreateEnv");
  await generate(questionNodes.selectTeamsAppManifest(), "SelectTeamsManifest");
  await generate(questionNodes.validateTeamsApp(), "ValidateTeamsApp");
  await generate(questionNodes.previewWithTeamsAppManifest(), "PreviewTeamsApp");
  await generate(questionNodes.grantPermission(), "PermissionGrant");
  await generate(questionNodes.listCollaborator(), "PermissionList");
  await generate(questionNodes.deployAadManifest(), "DeployAadManifest");
}

batchGenerate();
