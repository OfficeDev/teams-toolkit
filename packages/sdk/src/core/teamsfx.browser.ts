// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TokenCredential } from "@azure/identity";
import { TeamsUserCredential } from "../credential/teamsUserCredential.browser";
import { IdentityType } from "../models/identityType";
import { UserInfo } from "../models/userinfo";
import { formatString } from "../util/utils";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { internalLogger } from "../util/logger";
import { TeamsFxConfiguration } from "../models/teamsfxConfiguration";
import { AuthenticationConfiguration } from "../models/configuration";

/**
 * A class providing credential and configuration.
 * @deprecated Please use {@link TeamsUserCredential}
 * in browser environment and {@link OnBehalfOfUserCredential} or {@link AppCredential} in NodeJS.
 */
export class TeamsFx implements TeamsFxConfiguration {
  private configuration: Map<string, string | undefined>;
  private teamsUserCredential?: TeamsUserCredential;
  public identityType: IdentityType;

  constructor(
    identityType?: IdentityType,
    customConfig?: Record<string, string> | AuthenticationConfiguration
  ) {
    this.identityType = identityType ?? IdentityType.User;
    if (this.identityType !== IdentityType.User) {
      const errorMsg = formatString(
        ErrorMessage.IdentityTypeNotSupported,
        this.identityType.toString(),
        "TeamsFx"
      );
      internalLogger.error(errorMsg);
      throw new ErrorWithCode(errorMsg, ErrorCode.IdentityTypeNotSupported);
    }
    this.configuration = new Map<string, string>();
    this.loadFromEnv();
    if (customConfig) {
      const myConfig: Record<string, string> = { ...customConfig };
      for (const key of Object.keys(myConfig)) {
        const value = myConfig[key];
        if (value) {
          this.configuration.set(key, value);
        }
      }
    }
    if (this.configuration.size === 0) {
      internalLogger.warn(
        "No configuration is loaded, please pass required configs to TeamsFx constructor"
      );
    }
  }

  private loadFromEnv(): void {
    if (window && (window as any).__env__) {
      // testing purpose
      const env = (window as any).__env__;
      this.configuration.set("authorityHost", env.REACT_APP_AUTHORITY_HOST);
      this.configuration.set("tenantId", env.REACT_APP_TENANT_ID);
      this.configuration.set("clientId", env.REACT_APP_CLIENT_ID);
      this.configuration.set("initiateLoginEndpoint", env.REACT_APP_START_LOGIN_PAGE_URL);
      this.configuration.set("applicationIdUri", env.M365_APPLICATION_ID_URI);
      this.configuration.set("apiEndpoint", env.REACT_APP_FUNC_ENDPOINT);
      this.configuration.set("apiName", env.REACT_APP_FUNC_NAME);
    } else {
      // TODO: support common environment variable name
      try {
        this.configuration.set("authorityHost", process.env.REACT_APP_AUTHORITY_HOST);
        this.configuration.set("tenantId", process.env.REACT_APP_TENANT_ID);
        this.configuration.set("clientId", process.env.REACT_APP_CLIENT_ID);
        this.configuration.set("initiateLoginEndpoint", process.env.REACT_APP_START_LOGIN_PAGE_URL);
        this.configuration.set("applicationIdUri", process.env.M365_APPLICATION_ID_URI);
        this.configuration.set("apiEndpoint", process.env.REACT_APP_FUNC_ENDPOINT);
        this.configuration.set("apiName", process.env.REACT_APP_FUNC_NAME);
      } catch (_) {
        internalLogger.warn(
          "Cannot read process.env, please use webpack if you want to use environment variables."
        );
        return;
      }
    }
  }

  getIdentityType(): IdentityType {
    return this.identityType;
  }

  public getCredential(): TokenCredential {
    if (!this.teamsUserCredential) {
      this.teamsUserCredential = new TeamsUserCredential(Object.fromEntries(this.configuration));
    }
    return this.teamsUserCredential;
  }

  public async getUserInfo(resources?: string[]): Promise<UserInfo> {
    return await (this.getCredential() as TeamsUserCredential).getUserInfo(resources);
  }

  public async login(scopes: string | string[], resources?: string[]): Promise<void> {
    await (this.getCredential() as TeamsUserCredential).login(scopes, resources);
  }

  public setSsoToken(ssoToken: string): TeamsFx {
    return this;
  }

  public getConfig(key: string): string {
    const value = this.configuration.get(key);
    if (!value) {
      throw new Error();
    }
    return value;
  }

  public hasConfig(key: string): boolean {
    const value = this.configuration.get(key);
    return !!value;
  }

  public getConfigs(): Record<string, string> {
    const config: Record<string, string> = {};
    for (const key of this.configuration.keys()) {
      const value = this.configuration.get(key);
      if (value) {
        config[key] = value;
      }
    }
    return config;
  }
}
