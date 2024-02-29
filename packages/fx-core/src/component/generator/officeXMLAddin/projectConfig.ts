// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author zyun@microsoft.com
 */

interface IOfficeXMLAddinRepoConfig {
  repo: string;
  branch: string;
}

interface IOfficeXMLAddinHostConfig {
  [property: string]: {
    title: string;
    detail: string;
    lang: {
      ts?: IOfficeXMLAddinRepoConfig;
      js?: IOfficeXMLAddinRepoConfig;
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
      ts: { repo: "https://github.com/OfficeDev/Office-Addin-TaskPane", branch: "yo-office" },
      js: { repo: "https://github.com/OfficeDev/Office-Addin-TaskPane-JS", branch: "yo-office" },
    },
  },
  sso: {
    lang: {
      ts: { repo: "https://github.com/OfficeDev/Office-Addin-TaskPane-SSO", branch: "yo-office" },
      js: {
        repo: "https://github.com/OfficeDev/Office-Addin-TaskPane-SSO-JS",
        branch: "yo-office",
      },
    },
  },
  react: {
    lang: {
      ts: { repo: "https://github.com/OfficeDev/Office-Addin-TaskPane-React", branch: "yo-office" },
      js: {
        repo: "https://github.com/OfficeDev/Office-Addin-TaskPane-React-JS",
        branch: "yo-office",
      },
    },
  },
  manifest: {
    title: "core.createProjectQuestion.officeXMLAddin.manifestOnly.title",
    detail: "core.createProjectQuestion.officeXMLAddin.manifestOnly.detail",
    lang: {},
  },
};

export const OfficeXMLAddinProjectConfig: IOfficeXMLAddinProjectConfig = {
  word: {
    taskpane: { ...CommonProjectConfig.taskpane },
    sso: {
      title: "core.createProjectQuestion.officeXMLAddin.word.sso.title",
      detail: "core.createProjectQuestion.officeXMLAddin.word.sso.detail",
      ...CommonProjectConfig.sso,
    },
    react: {
      title: "core.createProjectQuestion.officeXMLAddin.word.react.title",
      detail: "core.createProjectQuestion.officeXMLAddin.word.react.detail",
      ...CommonProjectConfig.react,
    },
    manifest: { ...CommonProjectConfig.manifest },
  },
  excel: {
    taskpane: { ...CommonProjectConfig.taskpane },
    sso: {
      title: "core.createProjectQuestion.officeXMLAddin.excel.sso.title",
      detail: "core.createProjectQuestion.officeXMLAddin.excel.sso.detail",
      ...CommonProjectConfig.sso,
    },
    react: {
      title: "core.createProjectQuestion.officeXMLAddin.excel.react.title",
      detail: "core.createProjectQuestion.officeXMLAddin.excel.react.detail",
      ...CommonProjectConfig.react,
    },
    cfShared: {
      title: "core.createProjectQuestion.officeXMLAddin.excel.cf.shared.title",
      detail: "core.createProjectQuestion.officeXMLAddin.excel.cf.shared.detail",
      lang: {
        ts: {
          repo: "https://github.com/OfficeDev/Excel-Custom-Functions",
          branch: "shared-runtime-yo-office",
        },
        js: {
          repo: "https://github.com/OfficeDev/Excel-Custom-Functions-JS",
          branch: "shared-runtime-yo-office",
        },
      },
    },
    cfJS: {
      title: "core.createProjectQuestion.officeXMLAddin.excel.cf.js.title",
      detail: "core.createProjectQuestion.officeXMLAddin.excel.cf.js.detail",
      lang: {
        ts: { repo: "https://github.com/OfficeDev/Excel-Custom-Functions", branch: "yo-office" },
        js: { repo: "https://github.com/OfficeDev/Excel-Custom-Functions-JS", branch: "yo-office" },
      },
    },
    manifest: { ...CommonProjectConfig.manifest },
  },
  powerpoint: {
    taskpane: { ...CommonProjectConfig.taskpane },
    sso: {
      title: "core.createProjectQuestion.officeXMLAddin.powerpoint.sso.title",
      detail: "core.createProjectQuestion.officeXMLAddin.powerpoint.sso.detail",
      ...CommonProjectConfig.sso,
    },
    react: {
      title: "core.createProjectQuestion.officeXMLAddin.powerpoint.react.title",
      detail: "core.createProjectQuestion.officeXMLAddin.powerpoint.react.detail",
      ...CommonProjectConfig.react,
    },
    manifest: { ...CommonProjectConfig.manifest },
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
): IOfficeXMLAddinRepoConfig {
  const result = OfficeXMLAddinProjectConfig[host][proj].lang?.[lang];
  return !!result ? result : { repo: "", branch: "" };
}
