// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { getLocalizedString } from "../../../common/localizeUtils";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { CreateOauthArgs } from "./interface/createOauthArgs";
import { DriverContext } from "../interface/commonArgs";
import { M365TokenProvider, SystemError, UserError, err, ok } from "@microsoft/teamsfx-api";
import { InvalidActionInputError, assembleError } from "../../../error/common";
import { logMessageKeys, maxSecretLength, minSecretLength } from "./utility/constants";
import { OutputEnvironmentVariableUndefinedError } from "../error/outputEnvironmentVariableUndefinedError";
import { CreateOauthOutputs, OutputKeys } from "./interface/createOauthOutputs";
import { loadStateFromEnv } from "../util/utils";
import { AppStudioScopes } from "../teamsApp/constants";
import { AppStudioClient } from "../teamsApp/clients/appStudioClient";
import {
  OauthRegistrationAppType,
  OauthRegistrationTargetAudience,
  OauthRegistration,
  OauthRegistrationUserAccessType,
} from "../teamsApp/interfaces/OauthRegistration";
import { OauthNameTooLongError } from "./error/oauthNameTooLong";
import { GraphScopes } from "../../../common/tools";
import { OauthInfo, getandValidateOauthInfoFromSpec } from "./utility/utility";
import { QuestionMW } from "../../middleware/questionMW";
import { QuestionNames } from "../../../question/questionNames";
import { Service } from "typedi";

const actionName = "oauth/register"; // DO NOT MODIFY the name
const helpLink = "https://aka.ms/teamsfx-actions/oauth-register";
const supportedFlows = ["authorizationCode"];

@Service(actionName)
export class CreateOauthDriver implements StepDriver {
  description = getLocalizedString("driver.oauth.description.create");
  readonly progressTitle = getLocalizedString("driver.oauth.title.create");

  @hooks([QuestionMW("oauth", true), addStartAndEndTelemetry(actionName, actionName)])
  public async execute(
    args: CreateOauthArgs,
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

      const state = loadStateFromEnv(outputEnvVarNames) as CreateOauthOutputs;
      const appStudioTokenRes = await context.m365TokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      if (appStudioTokenRes.isErr()) {
        throw appStudioTokenRes.error;
      }
      const appStudioToken = appStudioTokenRes.value;

      if (state && state.configurationId) {
        try {
          await AppStudioClient.getOauthRegistrationById(appStudioToken, state.configurationId);
          context.logProvider?.info(
            getLocalizedString(
              logMessageKeys.skipCreateOauth,
              outputEnvVarNames.get(OutputKeys.configurationId)
            )
          );
        } catch (error) {
          context.logProvider?.warning(
            getLocalizedString(
              logMessageKeys.oauthNotFound,
              outputEnvVarNames.get(OutputKeys.configurationId)
            )
          );
        }
      } else {
        const clientId = process.env[QuestionNames.OauthClientId];
        if (clientId) {
          args.clientId = clientId;
        }

        const clientSecret = process.env[QuestionNames.OauthClientSecret];
        if (clientSecret) {
          args.clientSecret = clientSecret;
        }

        this.validateArgs(args);

        const authInfo = await getandValidateOauthInfoFromSpec(args, context, actionName);

        const oauthRegistration = await this.mapArgsToOauthRegistration(
          context.m365TokenProvider,
          args,
          authInfo
        );

        const oauthRegistrationRes = await AppStudioClient.createOauthRegistration(
          appStudioToken,
          oauthRegistration
        );
        outputs.set(
          outputEnvVarNames.get(OutputKeys.configurationId)!,
          oauthRegistrationRes.configurationRegistrationId.oAuthConfigId
        );

        const summary = getLocalizedString(
          logMessageKeys.successCreateOauth,
          oauthRegistrationRes.configurationRegistrationId.oAuthConfigId
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

  private validateArgs(args: CreateOauthArgs): void {
    const invalidParameters: string[] = [];
    if (typeof args.name !== "string" || !args.name) {
      invalidParameters.push("name");
    }

    if (args.name.length > 128) {
      throw new OauthNameTooLongError(actionName);
    }

    if (typeof args.appId !== "string" || !args.appId) {
      invalidParameters.push("appId");
    }

    if (typeof args.apiSpecPath !== "string" || !args.apiSpecPath) {
      invalidParameters.push("apiSpecPath");
    }

    if (
      args.applicableToApps &&
      args.applicableToApps !== OauthRegistrationAppType.AnyApp &&
      args.applicableToApps !== OauthRegistrationAppType.SpecificApp
    ) {
      invalidParameters.push("applicableToApps");
    }

    if (
      args.targetAudience &&
      args.targetAudience !== OauthRegistrationTargetAudience.AnyTenant &&
      args.targetAudience !== OauthRegistrationTargetAudience.HomeTenant
    ) {
      invalidParameters.push("targetAudience");
    }

    if (typeof args.flow !== "string" || !args.flow || !supportedFlows.includes(args.flow)) {
      invalidParameters.push("flow");
    }

    if (typeof args.clientId !== "string" || !args.clientId) {
      invalidParameters.push("clientId");
    }

    if (args.clientSecret && !this.validateSecret(args.clientSecret)) {
      invalidParameters.push("clientSecret");
    }

    if (args.refreshUrl && typeof args.refreshUrl !== "string") {
      invalidParameters.push("refreshUrl");
    }

    if (invalidParameters.length > 0) {
      throw new InvalidActionInputError(actionName, invalidParameters, helpLink);
    }
  }

  private validateSecret(clientSecret: string): boolean {
    if (typeof clientSecret !== "string") {
      return false;
    }

    if (clientSecret.length > maxSecretLength || clientSecret.length < minSecretLength) {
      return false;
    }

    return true;
  }

  private async mapArgsToOauthRegistration(
    tokenProvider: M365TokenProvider,
    args: CreateOauthArgs,
    authInfo: OauthInfo
  ): Promise<OauthRegistration> {
    const currentUserRes = await tokenProvider.getJsonObject({ scopes: GraphScopes });
    if (currentUserRes.isErr()) {
      throw currentUserRes.error;
    }
    const currentUser = currentUserRes.value;
    const userId = currentUser["oid"] as string;

    const targetAudience = args.targetAudience
      ? (args.targetAudience as OauthRegistrationTargetAudience)
      : OauthRegistrationTargetAudience.AnyTenant;
    const applicableToApps = args.applicableToApps
      ? (args.applicableToApps as OauthRegistrationAppType)
      : OauthRegistrationAppType.AnyApp;

    return {
      description: args.name,
      targetUrlsShouldStartWith: authInfo.domain,
      applicableToApps: applicableToApps,
      specificAppId: applicableToApps === OauthRegistrationAppType.SpecificApp ? args.appId : "",
      targetAudience: targetAudience,
      clientId: args.clientId,
      clientSecret: args.clientSecret ?? "",
      authorizationEndpoint: authInfo.authorizationEndpoint,
      tokenExchangeEndpoint: authInfo.tokenExchangeEndpoint,
      tokenRefreshEndpoint: args.refreshUrl ?? authInfo.tokenRefreshEndpoint,
      scopes: authInfo.scopes,
      // TODO: add this part back after TDP update
      // manageableByUsers: [
      //   {
      //     userId: userId,
      //     accessType: OauthRegistrationUserAccessType.ReadWrite,
      //   },
      // ],
    } as OauthRegistration;
  }
}
