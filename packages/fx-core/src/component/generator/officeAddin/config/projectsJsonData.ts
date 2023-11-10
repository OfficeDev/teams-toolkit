// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import _ from "lodash";
import { projectProperties } from "./projectProperties";

export default class projectsJsonData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projectJsonData: any;

  constructor() {
    this.projectJsonData = projectProperties;
  }

  getProjectDisplayName(projectType: string): string {
    return this.projectJsonData.projectTypes[_.toLower(projectType)].displayname;
  }

  getProjectDetails(projectType: string): string {
    return this.projectJsonData.projectTypes[_.toLower(projectType)].detail;
  }

  getParsedProjectJsonData(): unknown {
    return this.projectJsonData;
  }

  getProjectTemplateNames(): string[] {
    const projectTemplates: string[] = [];
    for (const key in this.projectJsonData.projectTypes) {
      projectTemplates.push(key);
    }
    return projectTemplates;
  }

  projectBothScriptTypes(projectType: string): boolean {
    return (
      this.projectJsonData.projectTypes[_.toLower(projectType)].templates.javascript != undefined &&
      this.projectJsonData.projectTypes[_.toLower(projectType)].templates.typescript != undefined
    );
  }

  getManifestPath(projectType: string): string | undefined {
    return this.projectJsonData.projectTypes[projectType].manifestPath;
  }

  getHostTemplateNames(projectType: string): string[] {
    let hosts: string[] = [];
    if (projectType) {
      for (const key in this.projectJsonData.projectTypes) {
        if (key === projectType) {
          hosts = this.projectJsonData.projectTypes[key].supportedHosts;
        }
      }
    }
    return hosts;
  }

  getSupportedScriptTypes(projectType: string): string[] {
    const scriptTypes: string[] = [];
    if (projectType) {
      for (const template in this.projectJsonData.projectTypes[projectType].templates) {
        let scriptType = "";
        if (template === "javascript") {
          scriptType = "javascript";
        } else if (template === "typescript") {
          scriptType = "typescript";
        }

        scriptTypes.push(scriptType);
      }
    }
    return scriptTypes;
  }

  getHostDisplayName(hostKey: string): string | undefined {
    for (const key in this.projectJsonData.hostTypes) {
      if (_.toLower(hostKey) == key) {
        return this.projectJsonData.hostTypes[key].displayname;
      }
    }
    return undefined;
  }

  getProjectTemplateRepository(projectTypeKey: string, scriptType: string): string | undefined {
    for (const key in this.projectJsonData.projectTypes) {
      if (_.toLower(projectTypeKey) == key) {
        if (projectTypeKey == "manifest") {
          return this.projectJsonData.projectTypes[key].templates.manifestonly.repository;
        } else {
          return this.projectJsonData.projectTypes[key].templates[scriptType].repository;
        }
      }
    }
    return undefined;
  }

  getProjectTemplateBranchName(
    projectTypeKey: string,
    scriptType: string,
    prerelease: boolean
  ): string | undefined {
    for (const key in this.projectJsonData.projectTypes) {
      if (_.toLower(projectTypeKey) == key) {
        if (projectTypeKey == "manifest") {
          return this.projectJsonData.projectTypes.manifest.templates.branch;
        } else {
          if (prerelease) {
            return this.projectJsonData.projectTypes[key].templates[scriptType].prerelease;
          } else {
            return this.projectJsonData.projectTypes[key].templates[scriptType].branch;
          }
        }
      }
    }
    return undefined;
  }

  getProjectRepoAndBranch(
    projectTypeKey: string,
    scriptType: string,
    prerelease: boolean
  ): { repo: string | undefined; branch: string | undefined } {
    const repoBranchInfo: { repo: string | undefined; branch: string | undefined } = {
      repo: <string>(<unknown>null),
      branch: <string>(<unknown>null),
    };

    repoBranchInfo.repo = this.getProjectTemplateRepository(projectTypeKey, scriptType);
    repoBranchInfo.branch = repoBranchInfo.repo
      ? this.getProjectTemplateBranchName(projectTypeKey, scriptType, prerelease)
      : undefined;

    return repoBranchInfo;
  }

  getProjectRepoAndBranchNew(
    projectTypeKey: string,
    scriptType: string,
    frameworkType: string,
    prerelease: boolean
  ): { repo: string | undefined; branch: string | undefined } {
    const repoBranchInfo: { repo: string | undefined; branch: string | undefined } = {
      repo: <string>(<unknown>null),
      branch: <string>(<unknown>null),
    };

    repoBranchInfo.repo = this.getProjectTemplateRepositoryNew(
      projectTypeKey,
      scriptType,
      frameworkType
    );
    repoBranchInfo.branch = repoBranchInfo.repo
      ? this.getProjectTemplateBranchNameNew(projectTypeKey, scriptType, frameworkType, prerelease)
      : undefined;

    return repoBranchInfo;
  }

  getProjectTemplateRepositoryNew(
    projectTypeKey: string,
    scriptType: string,
    frameworkType: string
  ): string | undefined {
    for (const key in this.projectJsonData.projectTypes) {
      if (_.toLower(projectTypeKey) == key) {
        if (projectTypeKey == "manifest") {
          return this.projectJsonData.projectTypes[key].templates.manifestonly.repository;
        } else {
          return this.projectJsonData.projectTypes[key].templates[scriptType].frameworks[
            frameworkType
          ].repository;
        }
      }
    }
    return undefined;
  }

  getProjectTemplateBranchNameNew(
    projectTypeKey: string,
    scriptType: string,
    frameworkType: string,
    prerelease: boolean
  ): string | undefined {
    for (const key in this.projectJsonData.projectTypes) {
      if (_.toLower(projectTypeKey) == key) {
        if (projectTypeKey == "manifest") {
          return this.projectJsonData.projectTypes.manifest.templates.branch;
        } else {
          if (prerelease) {
            return this.projectJsonData.projectTypes[key].templates[scriptType].frameworks[
              frameworkType
            ].prerelease;
          } else {
            return this.projectJsonData.projectTypes[key].templates[scriptType].frameworks[
              frameworkType
            ].branch;
          }
        }
      }
    }
    return undefined;
  }
}
