// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IBot, IConfigurableTab, IStaticTab } from "@microsoft/teamsfx-api";
import path from "path";
import { Bicep } from "../../../common/constants";
import { getTemplatesFolder } from "../../../folder";

export class DotnetPluginPathInfo {
  static readonly bicepTemplateDir = path.join(
    getTemplatesFolder(),
    "plugins",
    "resource",
    "dotnet",
    "bicep"
  );
  static readonly botProvisionModulePath = path.join(
    DotnetPluginPathInfo.bicepTemplateDir,
    "botProvisionModule.template.bicep"
  );
  static readonly botProvisionOrchestrationPath = path.join(
    DotnetPluginPathInfo.bicepTemplateDir,
    "botProvisionOrchestration.template.bicep"
  );
  static readonly botParameterPath = path.join(
    DotnetPluginPathInfo.bicepTemplateDir,
    Bicep.ParameterFileName
  );
  static readonly webappProvisionModulePath = path.join(
    DotnetPluginPathInfo.bicepTemplateDir,
    "webappProvisionModule.template.bicep"
  );
  static readonly webappProvisionOrchestrationPath = path.join(
    DotnetPluginPathInfo.bicepTemplateDir,
    "webappProvisionOrchestration.template.bicep"
  );
  static readonly webappConfigModulePath = path.join(
    DotnetPluginPathInfo.bicepTemplateDir,
    "webappConfigModule.template.bicep"
  );
  static readonly webappConfigOrchestrationPath = path.join(
    DotnetPluginPathInfo.bicepTemplateDir,
    "webappConfigOrchestration.template.bicep"
  );
}

export class WebappBicep {
  static readonly endpoint = "provisionOutputs.webappOutput.value.endpoint";
  static readonly resourceId = "provisionOutputs.webappOutput.value.resourceId";
  static readonly domain = "provisionOutputs.webappOutput.value.domain";
  static readonly endpointAsParam = "webappProvision.outputs.endpoint";
  static readonly domainAsParam = "webappProvision.outputs.domain";

  static readonly Reference = {
    webappResourceId: WebappBicep.resourceId,
    endpoint: WebappBicep.endpoint,
    domain: WebappBicep.domain,
    endpointAsParam: WebappBicep.endpointAsParam,
    domainAsParam: WebappBicep.domainAsParam,
  };
}

export class ManifestSnippet {
  static readonly staticTabCapability: IStaticTab = {
    entityId: "index",
    name: "Personal Tab",
    contentUrl:
      "{{{state.fx-resource-dotnet.endpoint}}}{{{state.fx-resource-dotnet.indexPath}}}/tab",
    websiteUrl:
      "{{{state.fx-resource-dotnet.endpoint}}}{{{state.fx-resource-dotnet.indexPath}}}/tab",
    scopes: ["personal"],
  };

  static readonly configurableTabCapability: IConfigurableTab = {
    configurationUrl:
      "{{{state.fx-resource-dotnet.endpoint}}}{{{state.fx-resource-dotnet.indexPath}}}/config",
    canUpdateConfiguration: true,
    scopes: ["team", "groupchat"],
  };

  static readonly botCapability: IBot = {
    botId: "{{state.fx-resource-dotnet.botId}}",
    scopes: ["personal", "team", "groupchat"],
    supportsFiles: false,
    isNotificationOnly: false,
    commandLists: [
      {
        scopes: ["personal", "team", "groupchat"],
        commands: [
          {
            title: "welcome",
            description: "Resend welcome card of this Bot",
          },
          {
            title: "learn",
            description: "Learn about Adaptive Card and Bot Command",
          },
        ],
      },
    ],
  };

  static readonly getDeveloperSnippet = (name: string) => {
    return {
      name: name,
      websiteUrl: "{{{state.fx-resource-dotnet.endpoint}}}",
      privacyUrl:
        "{{{state.fx-resource-dotnet.endpoint}}}{{{state.fx-resource-dotnet.indexPath}}}/privacy",
      termsOfUseUrl:
        "{{{state.fx-resource-dotnet.endpoint}}}{{{state.fx-resource-dotnet.indexPath}}}/termsofuse",
    };
  };
}
