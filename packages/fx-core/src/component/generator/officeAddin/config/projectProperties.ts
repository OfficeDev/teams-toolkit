// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const projectProperties = {
  projectTypes: {
    taskpane: {
      displayname: "core.newTaskpaneAddin.label",
      detail: "core.newTaskpaneAddin.detail",
      manifestPath: "manifest.json",
      templates: {
        typescript: {
          prerelease: "json-preview-yo-office-prerelease",
          repository: "https://github.com/OfficeDev/Office-Addin-TaskPane",
          branch: "json-preview-yo-office",

          frameworks: {
            default: {
              repository: "https://github.com/YueLi-MSFT/Office-Addin-TaskPane",
              branch: "yueli/wxp-json-toolkit",
              prerelease: "yueli/wxp-json-toolkit",
            },
            react: {
              repository: "https://github.com/YueLi-MSFT/Office-Addin-TaskPane-React",
              branch: "yueli/json-preview-toolkit",
              prerelease: "yueli/json-preview-toolkit",
            },
          },
        },
        // TODO add javascript template
        javascript: {
          repository: "https://github.com/OfficeDev/Office-Addin-TaskPane",
          branch: "json-preview-yo-office",
          prerelease: "json-preview-yo-office-prerelease",

          frameworks: {
            default: {
              repository: "https://github.com/YueLi-MSFT/Office-Addin-TaskPane-JS",
              branch: "yueli/json-preview-toolkit",
              prerelease: "yueli/json-preview-toolkit",
            },
            react: {
              repository: "https://github.com/YueLi-MSFT/Office-Addin-TaskPane-React-JS",
              branch: "yueli/json-preview-toolkit",
              prerelease: "yueli/json-preview-toolkit",
            },
          },
        },
      },
      supportedHosts: ["Outlook", "Word", "Excel", "PowerPoint"],
    },
  },
  hostTypes: {
    excel: {
      displayname: "Excel",
    },
    onenote: {
      displayname: "OneNote",
    },
    outlook: {
      displayname: "Outlook",
    },
    powerpoint: {
      displayname: "PowerPoint",
    },
    project: {
      displayname: "Project",
    },
    word: {
      displayname: "Word",
    },
  },
};
