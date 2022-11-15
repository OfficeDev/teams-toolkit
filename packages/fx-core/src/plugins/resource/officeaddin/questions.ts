import {
  FolderQuestion,
  Inputs,
  OptionItem,
  SingleFileQuestion,
  SingleSelectQuestion,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";
import path from "path";
import projectsJsonData from "./config/projectsJsonData";

const jsonData = new projectsJsonData();

export enum QuestionName {
  AddinLanguageQuestion = "addin-language",
  AddinNameQuestion = "addin-name",
  AddinProjectFolderQuestion = "addin-project-folder",
  AddinProjectManifestQuestion = "addin-project-manifest",
  AddinTemplateSelectQuestion = "addin-template-select",
  OfficeHostQuestion = "addin-host",
}

// TODO: localize the strings
export const AddinNameQuestion: TextInputQuestion = {
  type: "text",
  name: QuestionName.AddinNameQuestion,
  title: "Add-in name",
  default: "office addin",
};

export const AddinLanguageQuestion: SingleSelectQuestion = {
  type: "singleSelect",
  name: QuestionName.AddinLanguageQuestion,
  title: "Add-in Language",
  staticOptions: [],
  dynamicOptions: async (inputs: Inputs): Promise<OptionItem[]> => {
    const template = getTemplate(inputs);
    const supportedTypes = jsonData.getSupportedScriptTypes(template);
    const options = supportedTypes.map((language) => ({ label: language, id: language }));
    return options.length > 0 ? options : [{ label: "No Options", id: "No Options" }];
  },
  default: async (inputs: Inputs): Promise<string> => {
    const template = getTemplate(inputs);
    const options = jsonData.getSupportedScriptTypes(template);
    return options[0] || "No Options";
  },
  placeholder: "This is placeholder",
  skipSingleOption: false,
};

export const OfficeHostQuestion: SingleSelectQuestion = {
  type: "singleSelect",
  name: QuestionName.OfficeHostQuestion,
  title: "Add-in Host",
  staticOptions: [],
  dynamicOptions: async (inputs: Inputs): Promise<OptionItem[]> => {
    const template = getTemplate(inputs);
    const getHostTemplateNames = jsonData.getHostTemplateNames(template);
    const options = getHostTemplateNames.map((host) => ({
      label: jsonData.getHostDisplayName(host) as string,
      id: host,
    }));
    return options.length > 0 ? options : [{ label: "No Options", id: "No Options" }];
  },
  default: async (inputs: Inputs): Promise<string> => {
    const template = getTemplate(inputs);
    const options = jsonData.getHostTemplateNames(template);
    return options[0] || "No Options";
  },
  placeholder: "This is placeholder",
  skipSingleOption: false,
};

export const AddinProjectFolderQuestion: FolderQuestion = {
  type: "folder",
  name: QuestionName.AddinProjectFolderQuestion,
  title: "Existing add-in project folder",
};

export const AddinProjectManifestQuestion: SingleFileQuestion = {
  type: "singleFile",
  name: QuestionName.AddinProjectManifestQuestion,
  title: "Select import project manifest file",
  default: (inputs: Inputs): string | undefined => {
    const projFolder: string = inputs[AddinProjectFolderQuestion.name];
    return path.join(projFolder, "manifest.json");
  },
  // validation: {
  //   validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
  //     if (previousInputs) {
  //       const projFolder: string = previousInputs[AddinProjectFolderQuestion.name];
  //       if (input.startsWith(projFolder) && input.endsWith(".json")) {
  //         return undefined;
  //       }
  //     }
  //     return "Needs to be in the project folder and be a json file";
  //   },
  // },
};

export function getTemplate(inputs: Inputs): string {
  const capabilities: string[] = inputs["capabilities"];
  const templates: string[] = jsonData.getProjectTemplateNames();

  const foundTemplate = templates.find((template) => {
    return capabilities.includes(template);
  });

  return foundTemplate ?? "";
}
