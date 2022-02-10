// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import { Bicep } from "../../../common/constants";
import { getTemplatesFolder } from "../../../folder";

export class DotnetPluginPathInfo {
  static readonly bicepTemplateDir = (resource: string): string =>
    path.join(getTemplatesFolder(), "plugins", "resource", resource, "bicep");
  static readonly botBicepTemplateDir = DotnetPluginPathInfo.bicepTemplateDir("botservice");
  static readonly botProvisionModulePath = path.join(
    DotnetPluginPathInfo.botBicepTemplateDir,
    "botServiceProvision.template.bicep"
  );
  static readonly botProvisionOrchestrationPath = path.join(
    DotnetPluginPathInfo.botBicepTemplateDir,
    Bicep.ProvisionFileName
  );
  static readonly webappBicepTemplateDir = DotnetPluginPathInfo.bicepTemplateDir("webapp");
  static readonly webappProvisionModulePath = path.join(
    DotnetPluginPathInfo.webappBicepTemplateDir,
    "webappProvision.template.bicep"
  );
  static readonly webappProvisionOrchestrationPath = path.join(
    DotnetPluginPathInfo.webappBicepTemplateDir,
    Bicep.ProvisionFileName
  );
  static readonly webappConfigModulePath = path.join(
    DotnetPluginPathInfo.webappBicepTemplateDir,
    "webappConfiguration.template.bicep"
  );
  static readonly webappConfigOrchestrationPath = path.join(
    DotnetPluginPathInfo.webappBicepTemplateDir,
    Bicep.ConfigFileName
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
