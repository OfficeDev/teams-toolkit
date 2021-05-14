// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ErrorWithCode, ErrorCode } from "../core/errors";
import { SSOTokenInfoBase, SSOTokenV1Info, SSOTokenV2Info } from "../models/ssoTokenInfo";
import { UserInfo } from "../models/userinfo";
import jwt_decode from "jwt-decode";
import { internalLogger } from "./logger";

/**
 * Parse jwt token payload
 *
 * @param token
 *
 * @returns Payload object
 *
 * @internal
 */
export function parseJwt(token: string): SSOTokenInfoBase {
  try {
    const tokenObj = jwt_decode(token) as SSOTokenInfoBase;
    if (!tokenObj || !tokenObj.exp) {
      throw new ErrorWithCode(
        "Decoded token is null or exp claim does not exists.",
        ErrorCode.InternalError
      );
    }

    return tokenObj;
  } catch (err) {
    const errorMsg = "Parse jwt token failed in node env with error: " + err.message;
    internalLogger.error(errorMsg);
    throw new ErrorWithCode(errorMsg, ErrorCode.InternalError);
  }
}

/**
 * @internal
 */
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
    preferredUserName: "",
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
 * @returns Formatted string
 *
 * @internal
 */
export function formatString(str: string, ...replacements: string[]): string {
  const args = replacements;
  return str.replace(/{(\d+)}/g, function (match, number) {
    return typeof args[number] != "undefined" ? args[number] : match;
  });
}

/**
 * @internal
 */
export function validateScopesType(value: any): void {
  // string
  if (typeof value === "string" || value instanceof String) {
    return;
  }

  // empty array
  if (Array.isArray(value) && value.length === 0) {
    return;
  }

  // string array
  if (Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string")) {
    return;
  }

  const errorMsg = "The type of scopes is not valid, it must be string or string array";
  internalLogger.error(errorMsg);
  throw new ErrorWithCode(errorMsg, ErrorCode.InvalidParameter);
}
