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

export const providerOptions: OptionItem[] = [githubOption, azdoOption, jenkinsOption];

export function ciOption(): OptionItem {
  return {
    id: "ci",
    label: "CI",
    detail: getLocalizedString("plugins.cicd.ciOption.detail"),
  };
}

export function cdOption(): OptionItem {
  return {
    id: "cd",
    label: "CD",
    detail: getLocalizedString("plugins.cicd.cdOption.detail"),
  };
}

export function provisionOption(): OptionItem {
  return {
    id: "provision",
    label: "Provision",
    detail: getLocalizedString("plugins.cicd.provisionOption.detail"),
  };
}

export function publishOption(): OptionItem {
  return {
    id: "publish",
    label: "Publish to Teams",
    detail: getLocalizedString("plugins.cicd.publishOption.detail"),
  };
}

export const templateOptions = () => [ciOption(), provisionOption(), cdOption(), publishOption()];

const templateIdLabelMap = new Map<string, string>([
  [ciOption().id, ciOption().label],
  [cdOption().id, cdOption().label],
  [provisionOption().id, provisionOption().label],
  [publishOption().id, publishOption().label],
]);

const providerIdLabelMap = new Map<string, string>([
  [githubOption.id, githubOption.label],
  [azdoOption.id, azdoOption.label],
  [jenkinsOption.id, jenkinsOption.label],
]);

export function templateIdToLabel(templateId: string): string {
  return templateIdLabelMap.get(templateId) ?? templateId;
}

export function providerIdToLabel(providerId: string): string {
  return providerIdLabelMap.get(providerId) ?? providerId;
}

export enum questionNames {
  Provider = "provider",
  Template = "template",
  Environment = "target-env",
}
