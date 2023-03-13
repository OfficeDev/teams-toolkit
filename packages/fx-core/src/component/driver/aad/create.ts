// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { Service } from "typedi";
import { CreateAadAppArgs } from "./interface/createAadAppArgs";
import { AadAppClient } from "./utility/aadAppClient";
import { CreateAadAppOutput } from "./interface/createAadAppOutput";
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

const actionName = "aadApp/create"; // DO NOT MODIFY the name
const helpLink = "https://aka.ms/teamsfx-actions/aadapp-create";
const driverConstants = {
  generateSecretErrorMessageKey: "driver.aadApp.error.generateSecretFailed",
};
const SECRET_AAD_APP_CLIENT_SECRET = "SECRET_AAD_APP_CLIENT_SECRET";
const AAD_APP_CLIENT_ID = "AAD_APP_CLIENT_ID";

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
  public async execute(args: CreateAadAppArgs, context: DriverContext): Promise<ExecutionResult> {
    const progressBarSettings = this.getProgressBarSetting();
    const progressHandler = context.ui?.createProgressBar(
      progressBarSettings.title,
      progressBarSettings.stepMessages.length
    );
    const summaries: string[] = [];
    try {
      await progressHandler?.start();

      context.logProvider?.info(getLocalizedString(logMessageKeys.startExecuteDriver, actionName));

      this.validateArgs(args);
      const aadAppClient = new AadAppClient(context.m365TokenProvider);
      const aadAppState = this.loadCurrentState();

      await progressHandler?.next(progressBarSettings.stepMessages.shift());
      if (!aadAppState.AAD_APP_CLIENT_ID) {
        context.logProvider?.info(
          getLocalizedString(logMessageKeys.startCreateAadApp, AAD_APP_CLIENT_ID)
        );
        // Create new AAD app if no client id exists
        const aadApp = await aadAppClient.createAadApp(args.name);
        aadAppState.AAD_APP_CLIENT_ID = aadApp.appId!;
        aadAppState.AAD_APP_OBJECT_ID = aadApp.id!;
        await this.setAadEndpointInfo(context.m365TokenProvider, aadAppState);
        const summary = getLocalizedString(logMessageKeys.successCreateAadApp, aadApp.id);
        context.logProvider?.info(summary);
        summaries.push(summary);
      } else {
        context.logProvider?.info(
          getLocalizedString(logMessageKeys.skipCreateAadApp, AAD_APP_CLIENT_ID)
        );
      }

      await progressHandler?.next(progressBarSettings.stepMessages.shift());
      if (args.generateClientSecret) {
        if (!aadAppState.SECRET_AAD_APP_CLIENT_SECRET) {
          context.logProvider?.info(
            getLocalizedString(
              logMessageKeys.startGenerateClientSecret,
              SECRET_AAD_APP_CLIENT_SECRET
            )
          );
          // Create new client secret if no client secret exists
          if (!aadAppState.AAD_APP_OBJECT_ID) {
            throw new MissingEnvUserError(
              actionName,
              "AAD_APP_OBJECT_ID",
              helpLink,
              driverConstants.generateSecretErrorMessageKey
            );
          }
          aadAppState.SECRET_AAD_APP_CLIENT_SECRET = await aadAppClient.generateClientSecret(
            aadAppState.AAD_APP_OBJECT_ID
          );
          const summary = getLocalizedString(
            logMessageKeys.successGenerateClientSecret,
            aadAppState.AAD_APP_OBJECT_ID
          );
          context.logProvider?.info(summary);
          summaries.push(summary);
        } else {
          context.logProvider?.info(
            getLocalizedString(logMessageKeys.skipCreateAadApp, SECRET_AAD_APP_CLIENT_SECRET)
          );
        }
      }

      context.logProvider?.info(
        getLocalizedString(logMessageKeys.successExecuteDriver, actionName)
      );
      await progressHandler?.end(true);

      return {
        result: ok(
          new Map(
            Object.entries(aadAppState) // convert each property to Map item
              .filter((item) => item[1] && item[1] !== "") // do not return Map item that is empty
          )
        ),
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

    if (invalidParameters.length > 0) {
      throw new InvalidActionInputError(actionName, invalidParameters, helpLink);
    }
  }

  private loadCurrentState(): CreateAadAppOutput {
    return {
      AAD_APP_CLIENT_ID: process.env.AAD_APP_CLIENT_ID,
      SECRET_AAD_APP_CLIENT_SECRET: process.env.SECRET_AAD_APP_CLIENT_SECRET,
      AAD_APP_OBJECT_ID: process.env.AAD_APP_OBJECT_ID,
      AAD_APP_TENANT_ID: process.env.AAD_APP_TENANT_ID,
      AAD_APP_OAUTH_AUTHORITY: process.env.AAD_APP_OAUTH_AUTHORITY,
      AAD_APP_OAUTH_AUTHORITY_HOST: process.env.AAD_APP_OAUTH_AUTHORITY_HOST,
    };
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
    state.AAD_APP_TENANT_ID = tenantId;
    state.AAD_APP_OAUTH_AUTHORITY_HOST = Constants.oauthAuthorityPrefix;
    state.AAD_APP_OAUTH_AUTHORITY = `${Constants.oauthAuthorityPrefix}/${tenantId}`;
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
