// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SpecParser } from "@microsoft/m365-spec-parser";
import { getAbsolutePath } from "../../../utils/common";
import { DriverContext } from "../../interface/commonArgs";
import { CreateApiKeyArgs } from "../interface/createApiKeyArgs";
import { UpdateApiKeyArgs } from "../interface/updateApiKeyArgs";
import { maxDomainPerApiKey } from "./constants";
import { ApiKeyDomainInvalidError } from "../error/apiKeyDomainInvalid";
import { ApiKeyFailedToGetDomainError } from "../error/apiKeyFailedToGetDomain";

// Needs to validate the parameters outside of the function
export function loadStateFromEnv(
  outputEnvVarNames: Map<string, string>
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [propertyName, envVarName] of outputEnvVarNames) {
    result[propertyName] = process.env[envVarName];
  }
  return result;
}

// TODO: need to add logic to read domain from env if need to support non-lifecycle commands
export async function getDomain(
  args: CreateApiKeyArgs | UpdateApiKeyArgs,
  context: DriverContext
): Promise<string[]> {
  const absolutePath = getAbsolutePath(args.apiSpecPath, context.projectPath);
  const parser = new SpecParser(absolutePath, {
    allowBearerTokenAuth: true, // Currently, API key auth support is actually bearer token auth
    allowMultipleParameters: true,
  });
  const listResult = await parser.list();
  const operations = listResult.APIs;
  const domains = operations
    .filter((value) => {
      const auth = value.auth;
      return (
        auth &&
        auth.authScheme.type === "http" &&
        auth.authScheme.scheme === "bearer" &&
        auth.name === args.name
      );
    })
    .map((value) => {
      return value.server;
    })
    .filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
  return domains;
}

export function validateDomain(domain: string[], actionName: string): void {
  if (domain.length > maxDomainPerApiKey) {
    throw new ApiKeyDomainInvalidError(actionName);
  }

  if (domain.length === 0) {
    throw new ApiKeyFailedToGetDomainError(actionName);
  }
}
