// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SpecParser } from "@microsoft/m365-spec-parser";
import { getAbsolutePath } from "../../../utils/common";
import { DriverContext } from "../../interface/commonArgs";
import { CreateOauthArgs } from "../interface/createOauthArgs";
import { isApiKeyEnabled, isMultipleParametersEnabled } from "../../../../common/featureFlags";
import { OpenAPIV3 } from "openapi-types";
import { isEqual } from "lodash";
import { maxDomainPerApiKey } from "./constants";
import { OauthDomainInvalidError } from "../error/oauthDomainInvalid";
import { OauthFailedToGetDomainError } from "../error/oauthFailedToGetDomain";
import { OauthAuthInfoInvalid } from "../error/oauthAuthInfoInvalid";

export interface OauthInfo {
  domain: string[];
  authorizationEndpoint: string;
  tokenExchangeEndpoint: string;
  tokenRefreshEndpoint?: string;
  scopes: string[];
}

interface AuthInfo {
  authorizationUrl: string;
  tokenUrl: string;
  refreshUrl?: string;
  scopes: string[];
}

export async function getandValidateOauthInfoFromSpec(
  args: CreateOauthArgs,
  context: DriverContext,
  actionName: string
): Promise<OauthInfo> {
  const absolutePath = getAbsolutePath(args.apiSpecPath, context.projectPath);
  const parser = new SpecParser(absolutePath, {
    allowBearerTokenAuth: isApiKeyEnabled(), // Currently, API key auth support is actually bearer token auth
    allowMultipleParameters: isMultipleParametersEnabled(),
  });
  const listResult = await parser.list();
  const operations = listResult.APIs.filter((value) => value.isValid).filter((value) => {
    const auth = value.auth;
    return auth && auth.authScheme.type === "oauth2" && auth.name === args.name;
  });

  const domains = operations
    .map((value) => {
      return value.server;
    })
    .filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
  validateDomain(domains, actionName);

  const authInfoArray = operations
    .map((value) => {
      let authInfo;
      switch (args.flow) {
        case "authorizationCode":
        default:
          authInfo = (value.auth?.authScheme as OpenAPIV3.OAuth2SecurityScheme).flows
            .authorizationCode;
      }
      return {
        authorizationUrl: authInfo!.authorizationUrl,
        tokenUrl: authInfo!.tokenUrl,
        refreshUrl: authInfo!.refreshUrl,
        scopes: Object.keys(authInfo!.scopes),
      };
    })
    .reduce((accumulator: AuthInfo[], currentValue) => {
      if (!accumulator.find((item) => isEqual(item, currentValue))) {
        accumulator.push(currentValue);
      }
      return accumulator;
    }, []);

  if (authInfoArray.length !== 1) {
    throw new OauthAuthInfoInvalid(actionName);
  }
  const authInfo = authInfoArray[0];
  return {
    domain: domains,
    authorizationEndpoint: authInfo.authorizationUrl,
    tokenExchangeEndpoint: authInfo.tokenUrl,
    tokenRefreshEndpoint: authInfo.refreshUrl,
    scopes: authInfo.scopes,
  };
}

function validateDomain(domain: string[], actionName: string): void {
  if (domain.length > maxDomainPerApiKey) {
    throw new OauthDomainInvalidError(actionName);
  }

  if (domain.length === 0) {
    throw new OauthFailedToGetDomainError(actionName);
  }
}
