// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks";
import { M365TokenProvider, SystemError, UserError, err, ok } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { isApiKeyEnabled, isMultipleParametersEnabled } from "../../../common/featureFlags";
import { getLocalizedString } from "../../../common/localizeUtils";
import { SpecParser } from "@microsoft/m365-spec-parser";
import { AppStudioScopes, GraphScopes } from "../../../common/tools";
import { InvalidActionInputError, assembleError } from "../../../error";
import { QuestionNames } from "../../../question";
import { QuestionMW } from "../../middleware/questionMW";
import { getAbsolutePath } from "../../utils/common";
import { OutputEnvironmentVariableUndefinedError } from "../error/outputEnvironmentVariableUndefinedError";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { AppStudioClient } from "../teamsApp/clients/appStudioClient";
import {
  ApiSecretRegistration,
  ApiSecretRegistrationAppType,
  ApiSecretRegistrationTargetAudience,
  ApiSecretRegistrationUserAccessType,
} from "../teamsApp/interfaces/ApiSecretRegistration";
import { ApiSecretRegistrationClientSecret } from "../teamsApp/interfaces/ApiSecretRegistrationClientSecret";
import { ApiKeyClientSecretInvalidError } from "./error/apiKeyClientSecretInvalid";
import { ApiKeyDomainInvalidError } from "./error/apiKeyDomainInvalid";
import { ApiKeyFailedToGetDomainError } from "./error/apiKeyFailedToGetDomain";
import { ApiKeyNameTooLongError } from "./error/apiKeyNameTooLong";
import { CreateApiKeyArgs } from "./interface/createApiKeyArgs";
import { CreateApiKeyOutputs, OutputKeys } from "./interface/createApiKeyOutputs";
import {
  logMessageKeys,
  maxDomainPerApiKey,
  maxSecretLength,
  minSecretLength,
} from "./utility/constants";

const actionName = "apiKey/register"; // DO NOT MODIFY the name
const helpLink = "https://aka.ms/teamsfx-actions/apiKey-register";

@Service(actionName) // DO NOT MODIFY the service name
export class CreateApiKeyDriver implements StepDriver {
  description = getLocalizedString("driver.apiKey.description.create");
  readonly progressTitle = getLocalizedString("driver.aadApp.apiKey.title.create");

  @hooks([QuestionMW("apiKey", true), addStartAndEndTelemetry(actionName, actionName)])
  public async execute(
    args: CreateApiKeyArgs,
    context: DriverContext,
    outputEnvVarNames?: Map<string, string>
  ): Promise<ExecutionResult> {
    const summaries: string[] = [];
    const outputs: Map<string, string> = new Map<string, string>();

    try {
      context.logProvider?.info(getLocalizedString(logMessageKeys.startExecuteDriver, actionName));

      if (!outputEnvVarNames) {
        throw new OutputEnvironmentVariableUndefinedError(actionName);
      }

      const state = this.loadStateFromEnv(outputEnvVarNames) as CreateApiKeyOutputs;
      const appStudioTokenRes = await context.m365TokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      if (appStudioTokenRes.isErr()) {
        throw appStudioTokenRes.error;
      }
      const appStudioToken = appStudioTokenRes.value;

      if (state && state.registrationId) {
        try {
          await AppStudioClient.getApiKeyRegistrationById(appStudioToken, state.registrationId);
          context.logProvider?.info(
            getLocalizedString(
              logMessageKeys.skipCreateApiKey,
              outputEnvVarNames.get(OutputKeys.registrationId)
            )
          );
        } catch (error) {
          context.logProvider?.warning(
            getLocalizedString(
              logMessageKeys.apiKeyNotFound,
              outputEnvVarNames.get(OutputKeys.registrationId)
            )
          );
        }
      } else {
        const clientSecret = this.loadClientSecret();
        if (clientSecret) {
          args.primaryClientSecret = clientSecret;
        }

        this.validateArgs(args);

        const domains = await this.getDomain(args, context);
        this.validateDomain(domains);

        const apiKey = await this.mapArgsToApiSecretRegistration(
          context.m365TokenProvider,
          args,
          domains
        );

        const apiRegistrationRes = await AppStudioClient.createApiKeyRegistration(
          appStudioToken,
          apiKey
        );
        outputs.set(outputEnvVarNames.get(OutputKeys.registrationId)!, apiRegistrationRes.id!);

        const summary = getLocalizedString(
          logMessageKeys.successCreateApiKey,
          apiRegistrationRes.id!
        );
        context.logProvider?.info(summary);
        summaries.push(summary);
      }

      return {
        result: ok(outputs),
        summaries: summaries,
      };
    } catch (error) {
      if (error instanceof UserError || error instanceof SystemError) {
        context.logProvider?.error(
          getLocalizedString(logMessageKeys.failedExecuteDriver, actionName, error.displayMessage)
        );
        return {
          result: err(error),
          summaries: summaries,
        };
      }

      const message = JSON.stringify(error);
      context.logProvider?.error(
        getLocalizedString(logMessageKeys.failedExecuteDriver, actionName, message)
      );
      return {
        result: err(assembleError(error as Error, actionName)),
        summaries: summaries,
      };
    }
  }

  // Needs to validate the parameters outside of the function
  private loadStateFromEnv(
    outputEnvVarNames: Map<string, string>
  ): Record<string, string | undefined> {
    const result: Record<string, string | undefined> = {};
    for (const [propertyName, envVarName] of outputEnvVarNames) {
      result[propertyName] = process.env[envVarName];
    }
    return result;
  }

  private loadClientSecret(): string | undefined {
    const clientSecret = process.env[QuestionNames.ApiSpecApiKey];
    return clientSecret;
  }

  private validateSecret(apiKeySecret: string): boolean {
    if (typeof apiKeySecret !== "string") {
      return false;
    }

    if (apiKeySecret.length > maxSecretLength || apiKeySecret.length < minSecretLength) {
      return false;
    }

    return true;
  }

  // TODO: need to add logic to read domain from env if need to support non-lifecycle commands
  private async getDomain(args: CreateApiKeyArgs, context: DriverContext): Promise<string[]> {
    const absolutePath = getAbsolutePath(args.apiSpecPath, context.projectPath);
    const parser = new SpecParser(absolutePath, {
      allowAPIKeyAuth: isApiKeyEnabled(),
      allowMultipleParameters: isMultipleParametersEnabled(),
    });
    const listResult = await parser.list();
    const operations = listResult.validAPIs;
    const domains = operations
      .filter((value) => {
        return value.auth?.type === "apiKey" && value.auth?.name === args.name;
      })
      .map((value) => {
        return value.server;
      })
      .filter((value, index, self) => {
        return self.indexOf(value) === index;
      });
    return domains;
  }

  private validateDomain(domain: string[]): void {
    if (domain.length > maxDomainPerApiKey) {
      throw new ApiKeyDomainInvalidError(actionName);
    }

    if (domain.length === 0) {
      throw new ApiKeyFailedToGetDomainError(actionName);
    }
  }

  private validateArgs(args: CreateApiKeyArgs): void {
    const invalidParameters: string[] = [];
    if (typeof args.name !== "string" || !args.name) {
      invalidParameters.push("name");
    }

    if (args.name.length > 128) {
      throw new ApiKeyNameTooLongError(actionName);
    }

    if (typeof args.appId !== "string" || !args.appId) {
      invalidParameters.push("appId");
    }

    if (args.primaryClientSecret && !this.validateSecret(args.primaryClientSecret)) {
      throw new ApiKeyClientSecretInvalidError(actionName);
    }

    if (args.secondaryClientSecret && !this.validateSecret(args.secondaryClientSecret)) {
      throw new ApiKeyClientSecretInvalidError(actionName);
    }

    if (typeof args.apiSpecPath !== "string" || !args.apiSpecPath) {
      invalidParameters.push("apiSpecPath");
    }

    if (invalidParameters.length > 0) {
      throw new InvalidActionInputError(actionName, invalidParameters, helpLink);
    }
  }

  private async mapArgsToApiSecretRegistration(
    tokenProvider: M365TokenProvider,
    args: CreateApiKeyArgs,
    domain: string[]
  ): Promise<ApiSecretRegistration> {
    const currentUserRes = await tokenProvider.getJsonObject({ scopes: GraphScopes });
    if (currentUserRes.isErr()) {
      throw currentUserRes.error;
    }
    const currentUser = currentUserRes.value;
    const userId = currentUser["oid"] as string;

    const secrets = [];
    if (args.primaryClientSecret) {
      secrets.push(args.primaryClientSecret);
    }
    if (args.secondaryClientSecret) {
      secrets.push(args.secondaryClientSecret);
    }
    let isPrimary = true;
    const clientSecrets = secrets.map((secret) => {
      const clientSecret: ApiSecretRegistrationClientSecret = {
        value: secret,
        description: args.name,
        priority: isPrimary ? 0 : 1,
        isValueRedacted: false,
      };
      isPrimary = false;
      return clientSecret;
    });

    const apiKey: ApiSecretRegistration = {
      description: args.name,
      targetUrlsShouldStartWith: domain,
      applicableToApps: ApiSecretRegistrationAppType.AnyApp,
      targetAudience: ApiSecretRegistrationTargetAudience.AnyTenant,
      clientSecrets: clientSecrets,
      manageableByUsers: [
        {
          userId: userId,
          accessType: ApiSecretRegistrationUserAccessType.ReadWrite,
        },
      ],
    };

    return apiKey;
  }
}
