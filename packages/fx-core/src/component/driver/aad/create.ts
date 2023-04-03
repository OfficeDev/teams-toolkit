// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { Service } from "typedi";
import { CreateAadAppArgs } from "./interface/createAadAppArgs";
import { AadAppClient } from "./utility/aadAppClient";
import { CreateAadAppOutput, OutputKeys } from "./interface/createAadAppOutput";
import { ProgressBarSetting } from "./interface/progressBarSetting";
import {
  FxError,
  M365TokenProvider,
  Result,
  SystemError,
  UserError,
  ok,
  err,
} from "@microsoft/teamsfx-api";
import { GraphScopes } from "../../../common/tools";
import { Constants } from "../../resource/aadApp/constants";
import { MissingEnvUserError } from "./error/missingEnvError";
import { UnhandledSystemError, UnhandledUserError } from "./error/unhandledError";
import axios from "axios";
import { hooks } from "@feathersjs/hooks/lib";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { getLocalizedString } from "../../../common/localizeUtils";
import { logMessageKeys, descriptionMessageKeys } from "./utility/constants";
import { InvalidActionInputError } from "../../../error/common";
import { loadStateFromEnv, mapStateToEnv } from "../util/utils";
import { SignInAudience } from "./interface/signInAudience";

const actionName = "aadApp/create"; // DO NOT MODIFY the name
const helpLink = "https://aka.ms/teamsfx-actions/aadapp-create";
const driverConstants = {
  generateSecretErrorMessageKey: "driver.aadApp.error.generateSecretFailed",
};

const defaultOutputEnvVarNames = {
  clientId: "AAD_APP_CLIENT_ID",
  objectId: "AAD_APP_OBJECT_ID",
  tenantId: "AAD_APP_TENANT_ID",
  authorityHost: "AAD_APP_OAUTH_AUTHORITY_HOST",
  authority: "AAD_APP_OAUTH_AUTHORITY",
  clientSecret: "SECRET_AAD_APP_CLIENT_SECRET",
};

@Service(actionName) // DO NOT MODIFY the service name
export class CreateAadAppDriver implements StepDriver {
  description = getLocalizedString(descriptionMessageKeys.create);

  public async run(
    args: CreateAadAppArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const result = await this.execute(args, context);
    return result.result;
  }

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async execute(
    args: CreateAadAppArgs,
    context: DriverContext,
    outputEnvVarNames?: Map<string, string>
  ): Promise<ExecutionResult> {
    const progressBarSettings = this.getProgressBarSetting();
    const progressHandler = context.ui?.createProgressBar(
      progressBarSettings.title,
      progressBarSettings.stepMessages.length
    );
    const summaries: string[] = [];
    let outputs: Map<string, string> = new Map<string, string>();
    try {
      await progressHandler?.start();

      context.logProvider?.info(getLocalizedString(logMessageKeys.startExecuteDriver, actionName));

      this.validateArgs(args);
      // TODO: Remove this logic when config manager forces schema validation
      if (!outputEnvVarNames) {
        outputEnvVarNames = new Map(Object.entries(defaultOutputEnvVarNames));
      }
      const aadAppClient = new AadAppClient(context.m365TokenProvider);
      const aadAppState: CreateAadAppOutput = loadStateFromEnv(outputEnvVarNames);
      await progressHandler?.next(progressBarSettings.stepMessages.shift());
      if (!aadAppState.clientId) {
        context.logProvider?.info(
          getLocalizedString(
            logMessageKeys.startCreateAadApp,
            outputEnvVarNames.get(OutputKeys.clientId)
          )
        );
        // Create new AAD app if no client id exists
        const signInAudience = args.signInAudience
          ? (args.signInAudience as SignInAudience)
          : SignInAudience.AzureADMyOrg;
        const aadApp = await aadAppClient.createAadApp(args.name, signInAudience);
        aadAppState.clientId = aadApp.appId!;
        aadAppState.objectId = aadApp.id!;
        await this.setAadEndpointInfo(context.m365TokenProvider, aadAppState);
        outputs = mapStateToEnv(aadAppState, outputEnvVarNames, [OutputKeys.clientSecret]);

        const summary = getLocalizedString(logMessageKeys.successCreateAadApp, aadApp.id);
        context.logProvider?.info(summary);
        summaries.push(summary);
      } else {
        context.logProvider?.info(
          getLocalizedString(
            logMessageKeys.skipCreateAadApp,
            outputEnvVarNames.get(OutputKeys.clientId)
          )
        );
      }

      await progressHandler?.next(progressBarSettings.stepMessages.shift());
      if (args.generateClientSecret) {
        if (!aadAppState.clientSecret) {
          context.logProvider?.info(
            getLocalizedString(
              logMessageKeys.startGenerateClientSecret,
              outputEnvVarNames.get(OutputKeys.clientSecret)
            )
          );
          // Create new client secret if no client secret exists
          if (!aadAppState.objectId) {
            throw new MissingEnvUserError(
              actionName,
              outputEnvVarNames.get(OutputKeys.objectId)!,
              helpLink,
              driverConstants.generateSecretErrorMessageKey
            );
          }
          aadAppState.clientSecret = await aadAppClient.generateClientSecret(aadAppState.objectId);
          outputs.set(outputEnvVarNames.get(OutputKeys.clientSecret)!, aadAppState.clientSecret);

          const summary = getLocalizedString(
            logMessageKeys.successGenerateClientSecret,
            aadAppState.objectId
          );
          context.logProvider?.info(summary);
          summaries.push(summary);
        } else {
          context.logProvider?.info(
            getLocalizedString(
              logMessageKeys.skipCreateAadApp,
              outputEnvVarNames.get(OutputKeys.clientSecret)
            )
          );
        }
      }

      context.logProvider?.info(
        getLocalizedString(logMessageKeys.successExecuteDriver, actionName)
      );
      await progressHandler?.end(true);

      return {
        result: ok(outputs),
        summaries: summaries,
      };
    } catch (error) {
      await progressHandler?.end(false);
      if (error instanceof UserError || error instanceof SystemError) {
        context.logProvider?.error(
          getLocalizedString(logMessageKeys.failExecuteDriver, actionName, error.displayMessage)
        );
        return {
          result: err(error),
          summaries: summaries,
        };
      }

      if (axios.isAxiosError(error)) {
        const message = JSON.stringify(error.response!.data);
        context.logProvider?.error(
          getLocalizedString(logMessageKeys.failExecuteDriver, actionName, message)
        );
        if (error.response!.status >= 400 && error.response!.status < 500) {
          return {
            result: err(new UnhandledUserError(actionName, message, helpLink)),
            summaries: summaries,
          };
        } else {
          return {
            result: err(new UnhandledSystemError(actionName, message)),
            summaries: summaries,
          };
        }
      }

      const message = JSON.stringify(error);
      context.logProvider?.error(
        getLocalizedString(logMessageKeys.failExecuteDriver, actionName, message)
      );
      return {
        result: err(new UnhandledSystemError(actionName, JSON.stringify(error))),
        summaries: summaries,
      };
    }
  }

  private validateArgs(args: CreateAadAppArgs): void {
    const invalidParameters: string[] = [];
    if (typeof args.name !== "string" || !args.name) {
      invalidParameters.push("name");
    }

    if (args.generateClientSecret === undefined || typeof args.generateClientSecret !== "boolean") {
      invalidParameters.push("generateClientSecret");
    }

    // Throw error if unexpected signInAudience
    if (
      args.signInAudience &&
      (typeof args.signInAudience !== "string" ||
        !Object.values(SignInAudience).includes(args.signInAudience))
    ) {
      invalidParameters.push("signInAudience");
    }

    if (invalidParameters.length > 0) {
      throw new InvalidActionInputError(actionName, invalidParameters, helpLink);
    }
  }

  // logic from
  // src\component\resource\aadApp\utils\tokenProvider.ts
  // src\component\resource\aadApp\utils\configs.ts
  private async setAadEndpointInfo(tokenProvider: M365TokenProvider, state: CreateAadAppOutput) {
    const tokenObjectResponse = await tokenProvider.getJsonObject({ scopes: GraphScopes });
    if (tokenObjectResponse.isErr()) {
      throw tokenObjectResponse.error;
    }

    const tenantId = tokenObjectResponse.value.tid as string; // The tid claim is AAD tenant id
    state.tenantId = tenantId;
    state.authorityHost = Constants.oauthAuthorityPrefix;
    state.authority = `${Constants.oauthAuthorityPrefix}/${tenantId}`;
  }

  private getProgressBarSetting(): ProgressBarSetting {
    return {
      title: getLocalizedString("driver.aadApp.progressBar.createAadAppTitle"),
      stepMessages: [
        getLocalizedString("driver.aadApp.progressBar.createAadAppStepMessage"), // step 1
        getLocalizedString("driver.aadApp.progressBar.generateClientSecretSetpMessage"), // step 2
      ],
    };
  }
}
