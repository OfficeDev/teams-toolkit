// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface ProvisionBicep {
  /*
    Content of this property will be appended to templates/azure/provision.bicep
    */
  Orchestration?: string;
  /*
    Content of each modules will be appended to templates/azure/provision/${moduleFileName}.bicep
    */
  Modules?: { [moduleFileName: string]: string };
}

export interface ConfigurationBicep {
  /*
    Content of this property will be appended to templates/azure/config.bicep
    */
  Orchestration?: string;
  /*
    Content of this property override each templates/azure/teamsFx/${moduleFileName}.bicep file
    */
  Modules?: { [moduleFileName: string]: string };
}
export interface Bicep {
  type: "bicep";
  Provision?: ProvisionBicep;
  Configuration?: ConfigurationBicep;
  /*
  The parameters will be merged to .fx/configs/azure.parameters.{env}.json
  All environments will be updated when you provides this parameter
  */
  Parameters?: Record<string, string>;
}
