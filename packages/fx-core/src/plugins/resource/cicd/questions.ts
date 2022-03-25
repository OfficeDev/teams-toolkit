// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { OptionItem } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../common/localizeUtils";

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
  detail: getLocalizedString("plugins.cicd.ciOption.detail"),
};

export const cdOption: OptionItem = {
  id: "cd",
  label: "CD",
  detail: getLocalizedString("plugins.cicd.cdOption.detail"),
};

export const provisionOption: OptionItem = {
  id: "provision",
  label: "Provision",
  detail: getLocalizedString("plugins.cicd.provisionOption.detail"),
};

export const publishOption: OptionItem = {
  id: "publish",
  label: "Publish",
  detail: getLocalizedString("plugins.cicd.publishOption.detail"),
};

export enum questionNames {
  Provider = "provider",
  Template = "template",
  Environment = "target-env",
}
