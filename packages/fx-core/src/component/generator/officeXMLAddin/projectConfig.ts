// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author zyun@microsoft.com
 */

export interface IOfficeAddinHostConfig {
  [property: string]: {
    title: string;
    detail: string;
    localTemplate: string;
    manifestPath?: string;
    framework: {
      [property: string]: {
        typescript?: string;
        javascript?: string;
      };
    };
  };
}

export interface IOfficeAddinProjectConfig {
  [property: string]: IOfficeAddinHostConfig;
}

export const OfficeAddinProjectConfig: IOfficeAddinProjectConfig = {
  json: {
    "json-taskpane": {
      title: "core.newTaskpaneAddin.label",
      detail: "core.newTaskpaneAddin.detail",
      localTemplate: "",
      framework: {
        default_old: {
          typescript: "https://aka.ms/teams-toolkit/office-addin-taskpane",
        },
        default: {
          typescript: "https://aka.ms/teams-toolkit/office-addin-taskpane/ts-default",
          javascript: "https://aka.ms/teams-toolkit/office-addin-taskpane/js-default",
        },
        react: {
          typescript: "https://aka.ms/teams-toolkit/office-addin-taskpane/ts-react",
          javascript: "https://aka.ms/teams-toolkit/office-addin-taskpane/js-react",
        },
      },
      manifestPath: "manifest.json",
    },
    "office-content-addin": {
      title: "core.newContentAddin.label",
      detail: "core.newContentAddin.detail",
      localTemplate: "",
      framework: {
        default: {
          typescript: "https://aka.ms/teams-toolkit/office-addin-content/ts-default",
          javascript: "https://aka.ms/teams-toolkit/office-addin-content/js-default",
        },
      },
      manifestPath: "manifest.json",
    },
  },
};
