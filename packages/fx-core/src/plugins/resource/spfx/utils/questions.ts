import { Question } from "@microsoft/teamsfx-api";

export enum SPFXQuestionNames {
  framework_type = "spfx-framework-type",
  webpart_name = "spfx-webpart-name",
  webpart_desp = "spfx-webpart-desp",
}

export const frameworkQuestion: Question = {
  type: "singleSelect",
  name: SPFXQuestionNames.framework_type,
  title: "Framework",
  staticOptions: [
    { id: "react", label: "React" },
    { id: "minimal", label: "Minimal" },
    { id: "none", label: "None" },
  ],
  placeholder: "Select an option",
  default: "react",
};

export const webpartNameQuestion: Question = {
  type: "text",
  name: SPFXQuestionNames.webpart_name,
  title: "Web Part Name",
  default: "helloworld",
  validation: {
    pattern: "^[a-zA-Z_][a-zA-Z0-9_]*$",
  },
};

export const webpartDescriptionQuestion: Question = {
  type: "text",
  name: SPFXQuestionNames.webpart_desp,
  title: "Web Part Description",
  default: "helloworld description",
  validation: {
    required: true,
  },
};
