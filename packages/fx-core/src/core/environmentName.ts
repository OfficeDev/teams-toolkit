// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

class EnvironmentNameManager {
  public readonly envNameRegex = /^[\w\d-_]+$/;
  public readonly envConfigNameRegex = /^config\.(?<envName>[\w\d-_]+)\.json$/i;
  public readonly envStateNameRegex = /^state\.(?<envName>[\w\d-_]+)\.json$/i;

  public readonly schema = "https://aka.ms/teamsfx-env-config-schema";
  public readonly envConfigDescription =
    `You can customize the TeamsFx config for different environments.` +
    ` Visit https://aka.ms/teamsfx-env-config to learn more about this.`;

  private readonly defaultEnvName = "dev";
  private readonly localEnvName = "local";
  private readonly testToolEnvName = "testtool";
  private readonly officeLocalEnvName = "local";

  public getDefaultEnvName() {
    return this.defaultEnvName;
  }

  public getLocalEnvName() {
    return this.localEnvName;
  }

  public getOfficeLocalEnvName() {
    return this.officeLocalEnvName;
  }

  public getTestToolEnvName() {
    return this.testToolEnvName;
  }

  public getNonRemoteEnvNames(): string[] {
    return [this.localEnvName, this.testToolEnvName, this.officeLocalEnvName];
  }

  public isRemoteEnvironment(env: string) {
    return this.getNonRemoteEnvNames().indexOf(env) === -1;
  }
}

export const environmentNameManager = new EnvironmentNameManager();
