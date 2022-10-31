import {
  Inputs,
  OptionItem,
  SingleSelectQuestion,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";
import projectsJsonData from "./config/projectsJsonData";

const jsonData = new projectsJsonData();

export enum QuestionName {
  AddinLanguageQuestion = "addin-language",
  AddinNameQuestion = "addin-name",
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
    const options = jsonData.getSupportedScriptTypes(template);
    return options.map((language) => ({ label: language, id: language }));
  },
  default: async (inputs: Inputs): Promise<string> => {
    const template = getTemplate(inputs);
    const options = jsonData.getSupportedScriptTypes(template);
    return options[0];
  },
  placeholder: "This is placeholder",
  skipSingleOption: true,
};

export const OfficeHostQuestion: SingleSelectQuestion = {
  type: "singleSelect",
  name: QuestionName.OfficeHostQuestion,
  title: "Add-in Host",
  staticOptions: [],
  dynamicOptions: async (inputs: Inputs): Promise<OptionItem[]> => {
    const template = getTemplate(inputs);
    const options = jsonData.getHostTemplateNames(template);
    return options.map((host) => ({
      label: jsonData.getHostDisplayName(host) as string,
      id: host,
    }));
  },
  default: async (inputs: Inputs): Promise<string> => {
    const template = getTemplate(inputs);
    const options = jsonData.getHostTemplateNames(template);
    return options[0];
  },
  placeholder: "This is placeholder",
  skipSingleOption: true,
};

export function getTemplate(inputs: Inputs): string {
  const capabilities: string[] = inputs["capabilities"];
  const templates: string[] = jsonData.getProjectTemplateNames();

  const foundTemplate = templates.find((template) => {
    return capabilities.includes(template);
  });

  return foundTemplate ?? "";
}
