// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks";
import { SystemError, UserError, err, ok } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { AppStudioScopes } from "../../../common/constants";
import { getLocalizedString } from "../../../common/localizeUtils";
import { InvalidActionInputError, assembleError } from "../../../error/common";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { AppStudioClient } from "../teamsApp/clients/appStudioClient";
import {
  OauthRegistration,
  OauthRegistrationAppType,
  OauthRegistrationTargetAudience,
} from "../teamsApp/interfaces/OauthRegistration";
import { OauthNameTooLongError } from "./error/oauthNameTooLong";
import { UpdateOauthArgs } from "./interface/updateOauthArgs";
import { logMessageKeys } from "./utility/constants";
import { getandValidateOauthInfoFromSpec } from "./utility/utility";

const actionName = "oauth/update"; // DO NOT MODIFY the name
const helpLink = "https://aka.ms/teamsfx-actions/oauth-update";

@Service(actionName)
export class UpdateOauthDriver implements StepDriver {
  description = getLocalizedString("driver.oauth.description.create");
  readonly progressTitle = getLocalizedString("driver.oauth.title.create");

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async execute(
    args: UpdateOauthArgs,
    context: DriverContext,
    outputEnvVarNames?: Map<string, string>
  ): Promise<ExecutionResult> {
    const summaries: string[] = [];
    const outputs: Map<string, string> = new Map<string, string>();

    try {
      context.logProvider?.info(getLocalizedString(logMessageKeys.startExecuteDriver, actionName));
      this.validateArgs(args);

      const authInfo = await getandValidateOauthInfoFromSpec(args, context, actionName);
      const domain = authInfo.domain;
      const appStudioTokenRes = await context.m365TokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      if (appStudioTokenRes.isErr()) {
        throw appStudioTokenRes.error;
      }
      const appStudioToken = appStudioTokenRes.value;
      const getOauthRes = await AppStudioClient.getOauthRegistrationById(
        appStudioToken,
        args.configurationId
      );

      const diffMsgs = this.compareOauthRegistration(getOauthRes, args, domain);
      // If there is no difference, skip the update
      if (!diffMsgs || diffMsgs.length === 0) {
        const summary = getLocalizedString(logMessageKeys.skipUpdateOauth);
        context.logProvider?.info(summary);
        summaries.push(summary);

        return {
          result: ok(outputs),
          summaries: summaries,
        };
      }

      // If there is difference, ask user to confirm the update
      // Skip confirm if only targetUrlsShouldStartWith is different when the url contains devtunnel
      if (!this.shouldSkipConfirm(diffMsgs, getOauthRes.targetUrlsShouldStartWith, domain)) {
        const userConfirm = await context.ui!.confirm!({
          name: "confirm-update-oauth",
          title: getLocalizedString("driver.oauth.confirm.update", diffMsgs.join(",\n")),
          default: true,
        });
        if (userConfirm.isErr()) {
          throw userConfirm.error;
        }
      }

      const oauth = this.mapArgsToOauthRegistration(args, domain);
      const updateApiKeyRes = await AppStudioClient.updateOauthRegistration(
        appStudioToken,
        oauth,
        args.configurationId
      );

      void context.ui!.showMessage(
        "info",
        getLocalizedString("driver.oauth.info.update", diffMsgs.join(",\n")),
        false
      );
      const summary = getLocalizedString(logMessageKeys.successUpdateOauth);
      context.logProvider?.info(summary);
      summaries.push(summary);

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

  private validateArgs(args: UpdateOauthArgs): void {
    const invalidParameters: string[] = [];
    if (typeof args.configurationId !== "string" || !args.configurationId) {
      invalidParameters.push("registrationId");
    }

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

    if (invalidParameters.length > 0) {
      throw new InvalidActionInputError(actionName, invalidParameters, helpLink);
    }
  }

  private compareOauthRegistration(
    current: OauthRegistration,
    input: UpdateOauthArgs,
    domain: string[]
  ): string[] {
    const diffMsgs: string[] = [];
    if (current.description !== input.name) {
      diffMsgs.push(`description: ${current.description as string} => ${input.name}`);
    }

    if (input.applicableToApps && current.applicableToApps !== input.applicableToApps) {
      let msg = `applicableToApps: ${current.applicableToApps} => ${input.applicableToApps}`;
      if (input.applicableToApps === "SpecificApp") {
        msg += `, m365AppId: ${input.appId}`;
      }
      diffMsgs.push(msg);
    }

    if (input.targetAudience && current.targetAudience !== input.targetAudience) {
      diffMsgs.push(
        `targetAudience: ${current.targetAudience as string} => ${input.targetAudience}`
      );
    }

    // Compare domain
    if (
      current.targetUrlsShouldStartWith.length !== domain.length ||
      !current.targetUrlsShouldStartWith.every((value) => domain.includes(value)) ||
      !domain.every((value) => current.targetUrlsShouldStartWith.includes(value))
    ) {
      diffMsgs.push(
        `targetUrlsShouldStartWith: ${current.targetUrlsShouldStartWith.join(",")} => ${domain.join(
          ","
        )}`
      );
    }

    return diffMsgs;
  }

  // Should skip confirm box if only targetUrlsShouldStartWith is different and the url contains devtunnel
  private shouldSkipConfirm(diffMsgs: string[], getDomain: string[], domain: string[]): boolean {
    return (
      diffMsgs.length === 1 &&
      diffMsgs[0].includes("targetUrlsShouldStartWith") &&
      getDomain.length === domain.length &&
      getDomain.every((value) => value.includes("devtunnel")) &&
      domain.every((value) => value.includes("devtunnel"))
    );
  }

  private mapArgsToOauthRegistration(args: UpdateOauthArgs, domain: string[]): OauthRegistration {
    const targetAudience = args.targetAudience
      ? (args.targetAudience as OauthRegistrationTargetAudience)
      : undefined;
    const applicableToApps = args.applicableToApps
      ? (args.applicableToApps as OauthRegistrationAppType)
      : undefined;

    return {
      description: args.name,
      targetUrlsShouldStartWith: domain,
      applicableToApps: applicableToApps,
      m365AppId: applicableToApps === OauthRegistrationAppType.SpecificApp ? args.appId : "",
      targetAudience: targetAudience,
    } as OauthRegistration;
  }
}
