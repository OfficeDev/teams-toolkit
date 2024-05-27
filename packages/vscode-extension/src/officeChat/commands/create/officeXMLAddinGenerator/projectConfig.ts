// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

interface IOfficeAddinHostConfig {
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

interface IOfficeAddinProjectConfig {
  [property: string]: IOfficeAddinHostConfig;
}

const CommonProjectConfig = {
  taskpane: {
    title: "core.createProjectQuestion.officeXMLAddin.taskpane.title",
    detail: "core.createProjectQuestion.officeXMLAddin.taskpane.detail",
    framework: {
      default: {
        typescript: "https://aka.ms/ccdevx-fx-taskpane-ts",
        javascript: "https://aka.ms/ccdevx-fx-taskpane-js",
      },
    },
  },
  sso: {
    framework: {
      default: {
        typescript: "https://aka.ms/ccdevx-fx-sso-ts",
        javascript: "https://aka.ms/ccdevx-fx-sso-js",
      },
    },
  },
  react: {
    framework: {
      default: {
        typescript: "https://aka.ms/ccdevx-fx-react-ts",
        javascript: "https://aka.ms/ccdevx-fx-react-js",
      },
    },
  },
  manifest: {
    title: "core.createProjectQuestion.officeXMLAddin.manifestOnly.title",
    detail: "core.createProjectQuestion.officeXMLAddin.manifestOnly.detail",
    framework: {
      default: {},
    },
  },
};

export const OfficeAddinProjectConfig: IOfficeAddinProjectConfig = {
  word: {
    "word-taskpane": {
      localTemplate: "word-taskpane",
      ...CommonProjectConfig.taskpane,
    },
    "word-sso": {
      title: "core.createProjectQuestion.officeXMLAddin.word.sso.title",
      detail: "core.createProjectQuestion.officeXMLAddin.word.sso.detail",
      localTemplate: "word-sso",
      ...CommonProjectConfig.sso,
    },
    "word-react": {
      title: "core.createProjectQuestion.officeXMLAddin.word.react.title",
      detail: "core.createProjectQuestion.officeXMLAddin.word.react.detail",
      localTemplate: "word-react",
      ...CommonProjectConfig.react,
    },
    "word-manifest": {
      localTemplate: "word-manifest-only",
      ...CommonProjectConfig.manifest,
    },
  },
  excel: {
    "excel-taskpane": {
      localTemplate: "excel-taskpane",
      ...CommonProjectConfig.taskpane,
    },
    "excel-sso": {
      title: "core.createProjectQuestion.officeXMLAddin.excel.sso.title",
      detail: "core.createProjectQuestion.officeXMLAddin.excel.sso.detail",
      localTemplate: "excel-sso",
      ...CommonProjectConfig.sso,
    },
    "excel-react": {
      title: "core.createProjectQuestion.officeXMLAddin.excel.react.title",
      detail: "core.createProjectQuestion.officeXMLAddin.excel.react.detail",
      localTemplate: "excel-react",
      ...CommonProjectConfig.react,
    },
    "excel-custom-functions-shared": {
      title: "core.createProjectQuestion.officeXMLAddin.excel.cf.shared.title",
      detail: "core.createProjectQuestion.officeXMLAddin.excel.cf.shared.detail",
      localTemplate: "excel-cf",
      framework: {
        default: {
          typescript: "https://aka.ms/ccdevx-fx-cf-shared-ts",
          javascript: "https://aka.ms/ccdevx-fx-cf-shared-js",
        },
      },
    },
    "excel-custom-functions-js": {
      title: "core.createProjectQuestion.officeXMLAddin.excel.cf.js.title",
      detail: "core.createProjectQuestion.officeXMLAddin.excel.cf.js.detail",
      localTemplate: "excel-cf",
      framework: {
        default: {
          typescript: "https://aka.ms/ccdevx-fx-cf-js-ts",
          javascript: "https://aka.ms/ccdevx-fx-cf-js-js",
        },
      },
    },
    "excel-manifest": {
      localTemplate: "excel-manifest-only",
      ...CommonProjectConfig.manifest,
    },
  },
  powerpoint: {
    "powerpoint-taskpane": {
      localTemplate: "powerpoint-taskpane",
      ...CommonProjectConfig.taskpane,
    },
    "powerpoint-sso": {
      localTemplate: "powerpoint-sso",
      title: "core.createProjectQuestion.officeXMLAddin.powerpoint.sso.title",
      detail: "core.createProjectQuestion.officeXMLAddin.powerpoint.sso.detail",
      ...CommonProjectConfig.sso,
    },
    "powerpoint-react": {
      localTemplate: "powerpoint-react",
      title: "core.createProjectQuestion.officeXMLAddin.powerpoint.react.title",
      detail: "core.createProjectQuestion.officeXMLAddin.powerpoint.react.detail",
      ...CommonProjectConfig.react,
    },
    "powerpoint-manifest": {
      localTemplate: "powerpoint-manifest-only",
      ...CommonProjectConfig.manifest,
    },
  },
};

export function getOfficeAddinTemplateConfig(addinHost: string): IOfficeAddinHostConfig {
  return OfficeAddinProjectConfig[addinHost];
}
