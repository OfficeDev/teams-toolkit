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

/**
 * A class providing credential and configuration.
 * @beta
 */
export class TeamsFx implements TeamsFxConfiguration {
  private configuration: Map<string, string | undefined>;
  private teamsUserCredential?: TeamsUserCredential;
  public identityType: IdentityType;

  constructor(identityType?: IdentityType, customConfig?: Record<string, string>) {
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
      for (const key of Object.keys(customConfig)) {
        const value = customConfig[key];
        if (value) {
          this.configuration.set(key, value);
        }
      }
    }
  }

  private loadFromEnv(): void {
    let env: any;
    if (window && (window as any).__env__) {
      // testing purpose
      env = (window as any).__env__;
    } else {
      env = process.env;
    }
    if (!env) {
      return;
    }
    this.configuration.set("authorityHost", env.REACT_APP_AUTHORITY_HOST);
    this.configuration.set("tenantId", env.REACT_APP_TENANT_ID);
    this.configuration.set("clientId", env.REACT_APP_CLIENT_ID);
    this.configuration.set("initiateLoginEndpoint", env.REACT_APP_START_LOGIN_PAGE_URL);
    this.configuration.set("applicationIdUri", env.M365_APPLICATION_ID_URI);
    this.configuration.set("apiEndpoint", env.REACT_APP_FUNC_ENDPOINT);
    this.configuration.set("apiName", env.REACT_APP_FUNC_NAME);

    Object.keys(env).forEach((key: string) => {
      const value = env[key];
      if (key.startsWith("TEAMSFX_") && value) {
        this.configuration.set(key.substring(8), value);
      }
    });
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

  public async getUserInfo(): Promise<UserInfo> {
    return await (this.getCredential() as TeamsUserCredential).getUserInfo();
  }

  public async login(scopes: string | string[]): Promise<void> {
    await (this.getCredential() as TeamsUserCredential).login(scopes);
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
