// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ErrorWithCode, ErrorCode } from "../core/errors";
import { SSOTokenInfoBase, SSOTokenV1Info, SSOTokenV2Info } from "../models/ssoTokenInfo";
import { UserInfo } from "../models/userinfo";
import jwt_decode from "jwt-decode";
import { internalLogger } from "./logger";

/**
 * Parse jwt token payload
 * @param token
 * @returns payload object
 */
export function parseJwt(token: string): any {
  try {
    return jwt_decode(token);
  } catch (err) {
    const errorMsg = "Parse jwt token failed in node env with error: " + err.message;
    internalLogger.error(errorMsg);
    throw new ErrorWithCode(errorMsg, ErrorCode.InternalError);
  }
}

/**
 * get expiration for JWT token, in ISO 8601 format (e.g. "2007-04-05T14:30Z")
 * @param token jwt token
 * @returns return expiration time in ISO 8601 format, string. If fail to parse jwt, return empty string.
 *
 * @internal
 */
export function getISOExpirationFromJWT(token: string): string {
  const obj = parseJwt(token) as SSOTokenInfoBase;
  if (obj && obj.exp) {
    return new Date(obj.exp * 1000).toISOString();
  }
  internalLogger.warn("Cannot read expiration info from token");
  return "";
}

export function getUserInfoFromSsoToken(ssoToken: string): UserInfo {
  if (!ssoToken) {
    const errorMsg = "SSO token is undefined.";
    internalLogger.error(errorMsg);
    throw new ErrorWithCode(errorMsg, ErrorCode.InvalidParameter);
  }
  const tokenObject = parseJwt(ssoToken) as SSOTokenV1Info | SSOTokenV2Info;

  const userInfo: UserInfo = {
    displayName: tokenObject.name,
    objectId: tokenObject.oid,
    preferredUserName: ""
  };

  if (tokenObject.ver === "2.0") {
    userInfo.preferredUserName = (tokenObject as SSOTokenV2Info).preferred_username;
  } else if (tokenObject.ver === "1.0") {
    userInfo.preferredUserName = (tokenObject as SSOTokenV1Info).upn;
  }
  return userInfo;
}

/**
 * Format string template with replacements
 *
 * ```typescript
 * const template = "{0} and {1} are fruit. {0} is my favorite one."
 * const formattedStr = formatString(template, "apple", "pear"); // formattedStr: "apple and pear are fruit. apple is my favorite one."
 * ```
 *
 * @param str string template
 * @param replacements replacement string array
 * @returns formatted string
 *
 * @beta
 */
export function formatString(str: string, ...replacements: string[]): string {
  const args = replacements;
  return str.replace(/{(\d+)}/g, function(match, number) {
    return typeof args[number] != "undefined" ? args[number] : match;
  });
}
