// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author zyun@microsoft.com
 */

interface IOfficeXMLAddinHostConfig {
  [property: string]: {
    title: string;
    detail: string;
    localTemplate: string;
    lang: {
      ts?: string;
      js?: string;
    };
  };
}

interface IOfficeXMLAddinProjectConfig {
  [property: string]: IOfficeXMLAddinHostConfig;
}

const CommonProjectConfig = {
  taskpane: {
    title: "core.createProjectQuestion.officeXMLAddin.taskpane.title",
    detail: "core.createProjectQuestion.officeXMLAddin.taskpane.detail",
    lang: {
      ts: "https://aka.ms/ccdevx-fx-taskpane-ts",
      js: "https://aka.ms/ccdevx-fx-taskpane-js",
    },
  },
  sso: {
    lang: {
      ts: "https://aka.ms/ccdevx-fx-sso-ts",
      js: "https://aka.ms/ccdevx-fx-sso-js",
    },
  },
  react: {
    lang: {
      ts: "https://aka.ms/ccdevx-fx-react-ts",
      js: "https://aka.ms/ccdevx-fx-react-js",
    },
  },
  manifest: {
    title: "core.createProjectQuestion.officeXMLAddin.manifestOnly.title",
    detail: "core.createProjectQuestion.officeXMLAddin.manifestOnly.detail",
    lang: {},
  },
};

const OfficeXMLAddinProjectConfig: IOfficeXMLAddinProjectConfig = {
  word: {
    taskpane: {
      localTemplate: "word-taskpane",
      ...CommonProjectConfig.taskpane,
    },
    sso: {
      title: "core.createProjectQuestion.officeXMLAddin.word.sso.title",
      detail: "core.createProjectQuestion.officeXMLAddin.word.sso.detail",
      localTemplate: "word-sso",
      ...CommonProjectConfig.sso,
    },
    react: {
      title: "core.createProjectQuestion.officeXMLAddin.word.react.title",
      detail: "core.createProjectQuestion.officeXMLAddin.word.react.detail",
      localTemplate: "word-react",
      ...CommonProjectConfig.react,
    },
    manifest: {
      localTemplate: "word-manifest-only",
      ...CommonProjectConfig.manifest,
    },
  },
  excel: {
    taskpane: {
      localTemplate: "excel-taskpane",
      ...CommonProjectConfig.taskpane,
    },
    sso: {
      title: "core.createProjectQuestion.officeXMLAddin.excel.sso.title",
      detail: "core.createProjectQuestion.officeXMLAddin.excel.sso.detail",
      localTemplate: "excel-sso",
      ...CommonProjectConfig.sso,
    },
    react: {
      title: "core.createProjectQuestion.officeXMLAddin.excel.react.title",
      detail: "core.createProjectQuestion.officeXMLAddin.excel.react.detail",
      localTemplate: "excel-react",
      ...CommonProjectConfig.react,
    },
    cfShared: {
      title: "core.createProjectQuestion.officeXMLAddin.excel.cf.shared.title",
      detail: "core.createProjectQuestion.officeXMLAddin.excel.cf.shared.detail",
      localTemplate: "excel-cf",
      lang: {
        ts: "https://aka.ms/ccdevx-fx-cf-shared-ts",
        js: "https://aka.ms/ccdevx-fx-cf-shared-js",
      },
    },
    cfJS: {
      title: "core.createProjectQuestion.officeXMLAddin.excel.cf.js.title",
      detail: "core.createProjectQuestion.officeXMLAddin.excel.cf.js.detail",
      localTemplate: "excel-cf",
      lang: {
        ts: "https://aka.ms/ccdevx-fx-cf-js-ts",
        js: "https://aka.ms/ccdevx-fx-cf-js-js",
      },
    },
    manifest: {
      localTemplate: "excel-manifest-only",
      ...CommonProjectConfig.manifest,
    },
  },
  powerpoint: {
    taskpane: {
      localTemplate: "powerpoint-taskpane",
      ...CommonProjectConfig.taskpane,
    },
    sso: {
      localTemplate: "powerpoint-sso",
      title: "core.createProjectQuestion.officeXMLAddin.powerpoint.sso.title",
      detail: "core.createProjectQuestion.officeXMLAddin.powerpoint.sso.detail",
      ...CommonProjectConfig.sso,
    },
    react: {
      localTemplate: "powerpoint-react",
      title: "core.createProjectQuestion.officeXMLAddin.powerpoint.react.title",
      detail: "core.createProjectQuestion.officeXMLAddin.powerpoint.react.detail",
      ...CommonProjectConfig.react,
    },
    manifest: {
      localTemplate: "powerpoint-manifest-only",
      ...CommonProjectConfig.manifest,
    },
  },
};

/**
 * Get all available Office XML Addin Project Options of one host
 * @param host Office host
 * @returns the detail proj options[] of the host
 */
export function getOfficeXMLAddinHostProjectOptions(host: string): {
  proj: string;
  title: string;
  detail: string;
}[] {
  const result = [];
  for (const proj in OfficeXMLAddinProjectConfig[host]) {
    result.push({
      proj,
      title: OfficeXMLAddinProjectConfig[host][proj].title,
      detail: OfficeXMLAddinProjectConfig[host][proj].detail,
    });
  }
  return result;
}

/**
 * Get all available Lang Options of one host and proj
 * @param host Office host
 * @param proj proj name
 * @returns the detail lang options[] of the proj
 */
export function getOfficeXMLAddinHostProjectLangOptions(
  host: string,
  proj: string
): {
  id: string;
  label: string;
}[] {
  const result = [];
  for (const lang in OfficeXMLAddinProjectConfig[host][proj].lang) {
    result.push(
      lang === "ts"
        ? { id: "typescript", label: "TypeScript" }
        : { id: "javascript", label: "JavaScript" }
    );
  }
  return result;
}

/**
 * Get all available Lang Options of one host and proj
 * @param host Office host
 * @param proj proj name
 * @returns the detail lang options[] of the proj
 */
export function getOfficeXMLAddinHostProjectTemplateName(host: string, proj: string): string {
  return OfficeXMLAddinProjectConfig[host][proj].localTemplate;
}

/**
 * Get the Repo Info of the proj
 * @param host wxp
 * @param proj proj name
 * @param lang ts or js
 * @returns Repo Info
 */
export function getOfficeXMLAddinHostProjectRepoInfo(
  host: string,
  proj: string,
  lang: "ts" | "js"
): string {
  const result = OfficeXMLAddinProjectConfig[host][proj].lang?.[lang];
  return !!result ? result : "";
}
