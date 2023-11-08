// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Service } from "typedi";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { getLocalizedString } from "../../../common/localizeUtils";
import { CreateApiKeyArgs } from "./interface/createApiKeyArgs";
import { DriverContext } from "../interface/commonArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { hooks } from "@feathersjs/hooks";
import { logMessageKeys, maxDomainPerApiKey, maxSecretPerApiKey } from "./utility/constants";
import { M365TokenProvider, SystemError, UserError, err, ok } from "@microsoft/teamsfx-api";
import { OutputEnvironmentVariableUndefinedError } from "../error/outputEnvironmentVariableUndefinedError";
import { CreateApiKeyOutputs, OutputKeys } from "./interface/createApiKeyOutputs";
import { AppStudioScopes, GraphScopes } from "../../../common/tools";
import { AppStudioClient } from "../teamsApp/clients/appStudioClient";
import { ApiSecretRegistrationClientSecret } from "../teamsApp/interfaces/ApiSecretRegistrationClientSecret";
import {
  ApiSecretRegistration,
  ApiSecretRegistrationAppType,
  ApiSecretRegistrationTargetAudience,
  ApiSecretRegistrationUserAccessType,
} from "../teamsApp/interfaces/ApiSecretRegistration";
import { InvalidActionInputError, UnhandledError } from "../../../error";
import { ApiKeyNameTooLongError } from "./error/apiKeyNameTooLong";
import { ApiKeyClientSecretInvalidError } from "./error/apiKeyClientSecretInvalid";
import { ApiKeyDomainInvalidError } from "./error/apiKeyDomainInvalid";
import { QuestionMW } from "../../middleware/questionMW";
import { QuestionNames } from "../../../question";
import { SpecParser } from "../../../common/spec-parser";
import { getAbsolutePath } from "../../utils/common";
import { ApiKeyFailedToGetDomainError } from "./error/apiKeyFailedToGetDomain";

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
          args.clientSecret = clientSecret;
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
        result: err(new UnhandledError(error as Error, actionName)),
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

  // Allowed secrets: secret or secret1, secret2
  // Need to validate secrets outside of the function
  private parseSecret(apiKeyClientSecret: string): string[] {
    const secrets = apiKeyClientSecret.trim().split(",");
    return secrets.map((secret) => secret.trim());
  }

  private validateSecret(apiKeySecret: string): boolean {
    if (typeof apiKeySecret !== "string") {
      return false;
    }

    const regExp = /^(\w){10,128}(,\s*\w{10,128})*/g;
    const regResult = regExp.exec(apiKeySecret);
    if (!regResult) {
      return false;
    }

    const secrets = this.parseSecret(apiKeySecret);
    if (secrets.length > maxSecretPerApiKey) {
      return false;
    }

    return true;
  }

  // TODO: need to add logic to read domain from env if need to support non-lifecycle commands
  private async getDomain(args: CreateApiKeyArgs, context: DriverContext): Promise<string[]> {
    const absolutePath = getAbsolutePath(args.apiSpecPath, context.projectPath);
    const parser = new SpecParser(absolutePath, {
      allowAPIKeyAuth: true,
    });
    const operations = await parser.list();
    const domains = operations
      .filter((value) => {
        return value.auth?.name === args.name;
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

    if (args.clientSecret && !this.validateSecret(args.clientSecret)) {
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

    const secrets = this.parseSecret(args.clientSecret!);
    let isPrimary = true;
    const clientSecrets = secrets.map((secret) => {
      const clientSecret: ApiSecretRegistrationClientSecret = {
        value: secret,
        description: args.name,
        priority: isPrimary ? 0 : 1,
        isValueRedacted: true,
      };
      isPrimary = false;
      return clientSecret;
    });

    const apiKey: ApiSecretRegistration = {
      description: args.name,
      targetUrlsShouldStartWith: domain,
      applicableToApps: ApiSecretRegistrationAppType.SpecificApp,
      specificAppId: args.appId,
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
