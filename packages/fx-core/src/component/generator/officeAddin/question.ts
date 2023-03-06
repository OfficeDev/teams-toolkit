import {
  FolderQuestion,
  Inputs,
  OptionItem,
  QTreeNode,
  SingleFileQuestion,
  SingleSelectQuestion,
} from "@microsoft/teamsfx-api";
import path from "path";
import { getLocalizedString } from "../../../common/localizeUtils";
import { AzureSolutionQuestionNames } from "../../constants";
import projectsJsonData from "./config/projectsJsonData";

const jsonData = new projectsJsonData();

export const OfficeAddinItems: () => OptionItem[] = () =>
  jsonData.getProjectTemplateNames().map((template) => ({
    id: template,
    label: getLocalizedString(jsonData.getProjectDisplayName(template)),
    detail: getLocalizedString(jsonData.getProjectDetails(template)),
    groupName: getLocalizedString("core.options.separator.addin"),
  }));

// TODO: add localization strings
export function ImportAddinProjectItem(): OptionItem {
  return {
    id: "import-addin-project",
    label: getLocalizedString("core.importAddin.label"),
    cliName: "import",
    detail: getLocalizedString("core.importAddin.detail"),
    groupName: getLocalizedString("core.options.separator.addin"),
  };
}

export enum QuestionName {
  AddinLanguageQuestion = "addin-language",
  AddinNameQuestion = "addin-name",
  AddinProjectFolderQuestion = "addin-project-folder",
  AddinProjectManifestQuestion = "addin-project-manifest",
  AddinTemplateSelectQuestion = "addin-template-select",
  OfficeHostQuestion = "addin-host",
}

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
  skipSingleOption: true,
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
  skipSingleOption: true,
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
};

export const getTemplate = (inputs: Inputs): string => {
  const capabilities: string[] = inputs["capabilities"];
  const templates: string[] = jsonData.getProjectTemplateNames();

  const foundTemplate = templates.find((template) => {
    return capabilities.includes(template);
  });

  return foundTemplate ?? "";
};

export const getQuestionsForScaffolding = (): QTreeNode => {
  const importNode = new QTreeNode({ type: "group" });
  importNode.condition = {
    validFunc: (input: unknown, inputs?: Inputs) => {
      if (!inputs) {
        return "Invalid inputs";
      }
      const cap = inputs[AzureSolutionQuestionNames.Capabilities] as string;
      if (cap === ImportAddinProjectItem().id) {
        return undefined;
      }
      return "Office Addin is not selected";
    },
  };
  importNode.addChild(new QTreeNode(AddinProjectFolderQuestion));
  importNode.addChild(new QTreeNode(AddinProjectManifestQuestion));

  const templateNode = new QTreeNode({ type: "group" });
  templateNode.condition = {
    validFunc: (input: unknown, inputs?: Inputs) => {
      if (!inputs) {
        return "Invalid inputs";
      }
      const cap = inputs[AzureSolutionQuestionNames.Capabilities] as string;
      const addinOptionIds: string[] = [
        ...OfficeAddinItems().map((item) => {
          return item.id;
        }),
      ];
      if (addinOptionIds.includes(cap)) {
        return undefined;
      }
      return "Office Addin is not selected";
    },
  };
  templateNode.addChild(new QTreeNode(AddinLanguageQuestion));
  templateNode.addChild(new QTreeNode(OfficeHostQuestion));

  const root = new QTreeNode({ type: "group" });
  root.addChild(importNode);
  root.addChild(templateNode);

  return root;
};
