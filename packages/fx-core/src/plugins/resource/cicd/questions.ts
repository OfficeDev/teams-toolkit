import { OptionItem } from "@microsoft/teamsfx-api";

export const githubOption: OptionItem = {
  id: "github",
  label: "GitHub",
  detail: "",
};

export const azdoOption: OptionItem = {
  id: "azdo",
  label: "Azure DevOps",
  detail: "",
};

export const jenkinsOption: OptionItem = {
  id: "jenkins",
  label: "Jenkins",
  detail: "",
};

export const ciOption: OptionItem = {
  id: "ci",
  label: "CI",
  detail: "Help checkout code, build and run test.",
};

export const cdOption: OptionItem = {
  id: "cd",
  label: "CD",
  detail: "Help checkout code, build, test and deploy to cloud.",
};

export const provisionOption: OptionItem = {
  id: "provision",
  label: "Provision",
  detail: "Help create/update resources in cloud and Teams app registration.",
};

export const publishOption: OptionItem = {
  id: "publish",
  label: "Publish",
  detail: "Help publish Teams app to tenants.",
};
