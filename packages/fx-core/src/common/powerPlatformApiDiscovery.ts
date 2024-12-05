// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export type ClusterCategory =
  | "local"
  | "dev"
  | "test"
  | "preprod"
  | "firstrelease"
  | "prod"
  | "gov"
  | "high"
  | "dod"
  | "mooncake"
  | "ex"
  | "rx";

export class PowerPlatformApiDiscovery {
  readonly clusterCategory: ClusterCategory;

  constructor(clusterCategory: ClusterCategory) {
    this.clusterCategory = clusterCategory;
  }

  public getTokenAudience(): string {
    return `https://${this._getEnvironmentApiHostNameSuffix()}`;
  }

  public getTokenEndpointHost(): string {
    return this._getEnvironmentApiHostNameSuffix();
  }

  public getTenantEndpoint(tenantId: string): string {
    return this._generatePowerPlatformApiDomain(tenantId, "tenant");
  }

  public getTenantIslandClusterEndpoint(tenantId: string): string {
    return this._generatePowerPlatformApiDomain(tenantId, "tenant", "il-");
  }

  public getEnvironmentEndpoint(environmentId: string): string {
    return this._generatePowerPlatformApiDomain(environmentId, "environment");
  }

  private _generatePowerPlatformApiDomain(
    hostNameIdentifier: string,
    hostNameInfix: "environment" | "tenant",
    hostNamePrefix = ""
  ): string {
    if (!/^[a-zA-Z0-9\-]+$/g.test(hostNameIdentifier)) {
      throw new Error(
        `Cannot generate Power Platform API endpoint because the ${hostNameInfix} identifier contains invalid host name characters, only alphanumeric and dash characters are expected: ${hostNameIdentifier}`
      );
    }

    const hexNameSuffixLength = this._getHexApiSuffixLength();
    const hexName = hostNameIdentifier.toLowerCase().replace(/-/g, "");

    if (hexNameSuffixLength >= hexName.length) {
      throw new Error(
        `Cannot generate Power Platform API endpoint because the normalized ${hostNameInfix} identifier must be at least ${
          hexNameSuffixLength + 1
        } characters in length: ${hexName}`
      );
    }

    const hexNameSuffix = hexName.substring(hexName.length - hexNameSuffixLength);
    const hexNamePrefix = hexName.substring(0, hexName.length - hexNameSuffixLength);
    const hostNameSuffix = this._getEnvironmentApiHostNameSuffix();

    return `${hostNamePrefix}${hexNamePrefix}.${hexNameSuffix}.${hostNameInfix}.${hostNameSuffix}`;
  }

  private _getHexApiSuffixLength(): number {
    switch (this.clusterCategory) {
      case "firstrelease":
      case "prod":
        return 2;
      default:
        return 1;
    }
  }

  private _getEnvironmentApiHostNameSuffix(): string {
    switch (this.clusterCategory) {
      case "local":
        return "api.powerplatform.localhost";
      case "dev":
        return "api.dev.powerplatform.com";
      case "test":
        return "api.test.powerplatform.com";
      case "preprod":
        return "api.preprod.powerplatform.com";
      case "firstrelease":
      case "prod":
        return "api.powerplatform.com";
      case "gov":
        return "api.gov.powerplatform.microsoft.us";
      case "high":
        return "api.high.powerplatform.microsoft.us";
      case "dod":
        return "api.appsplatform.us";
      case "mooncake":
        return "api.powerplatform.partner.microsoftonline.cn";
      case "ex":
        return "api.powerplatform.eaglex.ic.gov";
      case "rx":
        return "api.powerplatform.microsoft.scloud";
      default:
        throw new Error(`Invalid ClusterCategory value: ${this.clusterCategory as string}`);
    }
  }
}
