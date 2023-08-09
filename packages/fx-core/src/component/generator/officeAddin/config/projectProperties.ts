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
          repository: "https://github.com/OfficeDev/Office-Addin-TaskPane",
          branch: "json-preview-yo-office",
          prerelease: "json-preview-yo-office-prerelease",
        },
      },
      supportedHosts: ["Outlook"],
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
