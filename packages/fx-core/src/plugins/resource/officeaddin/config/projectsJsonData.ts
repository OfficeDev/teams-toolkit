import * as fs from "fs";
import * as _ from "lodash";
import * as path from "path";

export default class projectsJsonData {
  m_projectJsonDataFile = "projectProperties.json";
  m_projectJsonData;

  constructor() {
    const jsonData = fs.readFileSync(path.join(__dirname, this.m_projectJsonDataFile));
    this.m_projectJsonData = JSON.parse(jsonData.toString());
  }

  isValidInput(input: string, isHostParam: boolean): boolean {
    if (isHostParam) {
      for (const key in this.m_projectJsonData.hostTypes) {
        if (_.toLower(input) == key) {
          return true;
        }
      }
      return false;
    } else {
      for (const key in this.m_projectJsonData.projectTypes) {
        if (_.toLower(input) == key) {
          return true;
        }
      }
      return false;
    }
  }

  getProjectDisplayName(projectType: string): string {
    return this.m_projectJsonData.projectTypes[_.toLower(projectType)].displayname;
  }

  getParsedProjectJsonData(): unknown {
    return this.m_projectJsonData;
  }

  getProjectTemplateNames(): string[] {
    const projectTemplates: string[] = [];
    for (const key in this.m_projectJsonData.projectTypes) {
      projectTemplates.push(key);
    }
    return projectTemplates;
  }

  projectBothScriptTypes(projectType: string): boolean {
    return (
      this.m_projectJsonData.projectTypes[_.toLower(projectType)].templates.javascript !=
        undefined &&
      this.m_projectJsonData.projectTypes[_.toLower(projectType)].templates.typescript != undefined
    );
  }

  getManifestPath(projectType: string): string | undefined {
    return this.m_projectJsonData.projectTypes[projectType].manifestPath;
  }

  getHostTemplateNames(projectType: string): string[] {
    let hosts: string[] = [];
    for (const key in this.m_projectJsonData.projectTypes) {
      if (key === projectType) {
        hosts = this.m_projectJsonData.projectTypes[key].supportedHosts;
      }
    }
    return hosts;
  }

  getSupportedScriptTypes(projectType: string): string[] {
    const scriptTypes: string[] = [];
    for (const template in this.m_projectJsonData.projectTypes[projectType].templates) {
      let scriptType = "";
      if (template === "javascript") {
        scriptType = "JavaScript";
      } else if (template === "typescript") {
        scriptType = "TypeScript";
      }

      scriptTypes.push(scriptType);
    }
    return scriptTypes;
  }

  getHostDisplayName(hostKey: string): string | undefined {
    for (const key in this.m_projectJsonData.hostTypes) {
      if (_.toLower(hostKey) == key) {
        return this.m_projectJsonData.hostTypes[key].displayname;
      }
    }
    return undefined;
  }

  getProjectTemplateRepository(projectTypeKey: string, scriptType: string): string | undefined {
    for (const key in this.m_projectJsonData.projectTypes) {
      if (_.toLower(projectTypeKey) == key) {
        if (projectTypeKey == "manifest") {
          return this.m_projectJsonData.projectTypes[key].templates.manifestonly.repository;
        } else {
          return this.m_projectJsonData.projectTypes[key].templates[scriptType].repository;
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
    for (const key in this.m_projectJsonData.projectTypes) {
      if (_.toLower(projectTypeKey) == key) {
        if (projectTypeKey == "manifest") {
          return this.m_projectJsonData.projectTypes.manifest.templates.branch;
        } else {
          if (prerelease) {
            return this.m_projectJsonData.projectTypes[key].templates[scriptType].prerelease;
          } else {
            return this.m_projectJsonData.projectTypes[key].templates[scriptType].branch;
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
    scriptType = scriptType === "TypeScript" ? "typescript" : "javascript";
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
}
