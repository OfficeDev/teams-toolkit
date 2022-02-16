// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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
