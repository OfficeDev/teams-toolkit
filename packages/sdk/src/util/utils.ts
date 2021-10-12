// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ErrorWithCode, ErrorCode } from "../core/errors";
import { SSOTokenInfoBase, SSOTokenV1Info, SSOTokenV2Info } from "../models/ssoTokenInfo";
import { UserInfo } from "../models/userinfo";
import jwt_decode from "jwt-decode";
import { internalLogger } from "./logger";
import { createHash } from "crypto";
import { ConfidentialClientApplication, NodeAuthOptions } from "@azure/msal-node";
import { AuthenticationConfiguration } from "../models/configuration";

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
  } catch (err: any) {
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

/**
 * @internal
 */
export function getScopesArray(scopes: string | string[]): string[] {
  const scopesArray: string[] = typeof scopes === "string" ? scopes.split(" ") : scopes;
  return scopesArray.filter((x) => x !== null && x !== "");
}

/**
 * @internal
 */
export function getAuthority(authorityHost: string, tenantId: string): string {
  const normalizedAuthorityHost = authorityHost.replace(/\/+$/g, "");
  return normalizedAuthorityHost + "/" + tenantId;
}

/**
 * @internal
 */
export function parseCertificate(
  certificateContent: string | undefined
): ClientCertificate | undefined {
  if (!certificateContent) {
    return undefined;
  }

  const certificatePattern =
    /(-+BEGIN CERTIFICATE-+)(\n\r?|\r\n?)([A-Za-z0-9+/\n\r]+=*)(\n\r?|\r\n?)(-+END CERTIFICATE-+)/;
  const match = certificatePattern.exec(certificateContent);
  if (!match) {
    const errorMsg = "The certificate content does not contain a PEM-encoded certificate.";
    internalLogger.error(errorMsg);
    throw new ErrorWithCode(errorMsg, ErrorCode.InvalidCertificate);
  }
  const thumbprint = createHash("sha1")
    .update(Buffer.from(match[3], "base64"))
    .digest("hex")
    .toUpperCase();

  return {
    thumbprint: thumbprint,
    privateKey: certificateContent,
  };
}

/**
 * @internal
 */
export function createConfidentialClientApplication(
  authentication: AuthenticationConfiguration
): ConfidentialClientApplication {
  const authority = getAuthority(authentication.authorityHost!, authentication.tenantId!);
  const clientCertificate: ClientCertificate | undefined = parseCertificate(
    authentication.certificateContent
  );

  const auth: NodeAuthOptions = {
    clientId: authentication.clientId!,
    authority: authority,
  };

  if (clientCertificate) {
    auth.clientCertificate = clientCertificate;
  } else {
    auth.clientSecret = authentication.clientSecret;
  }

  return new ConfidentialClientApplication({
    auth,
  });
}

/**
 * @internal
 */
export interface ClientCertificate {
  thumbprint: string;
  privateKey: string;
}
