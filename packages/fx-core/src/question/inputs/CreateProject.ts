// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface CreateProject {
  /**
   * @description: Teams Toolkit: Create a New App
   */
  scratch: "yes" | "no";
  /**
   * @description: Teams Toolkit: select runtime for your app
   */
  runtime?: "node" | "dotnet";
  /**
   * @description: New Project
   */
  projectType?: string;
  /**
   * @description: capabilities
   */
  capabilities: string;
  /**
   * @description: Choose triggers
   */
  botHostTypeTrigger?: string;
  /**
   * @description: SharePoint Solution
   */
  spfxSolution?: "new" | "import";
  /**
   * @description: SharePoint Framework
   */
  spfxInstallLatestPackage: string;
  /**
   * @description: Framework
   */
  spfxFrameworkType: "react" | "minimal" | "none";
  /**
   * @description: Web Part Name
   */
  spfxWebpartName: string;
  /**
   * @description: SPFx solution folder
   */
  spfxFolder?: string;
  /**
   * @description: Existing add-in project folder
   */
  addinProjectFolder: string;
  /**
   * @description: Select import project manifest file
   */
  addinProjectManifest: string;
  /**
   * @description: Add-in Host
   */
  addinHost?: string;
  /**
   * @description: OpenAPI Spec
   */
  apiSpecLocation?: string;
  /**
   * @description: OpenAI Plugin Manifest
   */
  openaiPluginManifestLocation?: string;
  /**
   * @description: Select an Operation
   */
  apiOperation: string[];
  /**
   * @description: Programming Language
   */
  programmingLanguage?: string;
  /**
   * @description: Workspace folder
   */
  folder: string;
  /**
   * @description: Application name
   */
  appName: string;
  /**
   * @description: Configure website URL(s) for debugging
   */
  replaceWebsiteUrl?: string[];
  /**
   * @description: Configure content URL(s) for debugging
   */
  replaceContentUrl?: string[];
  /**
   * @description: Create new bot(s) for debugging
   */
  replaceBotIds?: string[];
  /**
   * @description: Start from a sample
   */
  samples?: string;
}
