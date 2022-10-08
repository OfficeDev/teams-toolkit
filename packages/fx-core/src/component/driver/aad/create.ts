// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { StepDriver } from "../../interface/stepDriver";
import { DriverContext } from "../../interface/buildAndDeployArgs";
import { Service } from "typedi";
import { CreateAadAppArgs } from "./interface/createAadAppArgs";
import { AadAppClient } from "./utility/aadAppClient";
import { CreateAadAppOutput } from "./interface/createAadAppOutput";
import { M365TokenProvider, SystemError, UserError } from "@microsoft/teamsfx-api";
import { GraphScopes } from "../../../common/tools";
import { Constants } from "../../resource/aadApp/constants";
import { InvalidParameterUserError } from "./error/invalidParameterUserError";
import { MissingEnvUserError } from "./error/missingEnvError";
import { UnhandledSystemError, UnhandledUserError } from "./error/unhandledError";
import axios, { AxiosError } from "axios";

const actionName = "aadApp/create"; // DO NOT MODIFY the name
const helpLink = "https://aka.ms/teamsfx-actions/aadapp-create";
const driverConstants = {
  generateSecretErrorMessageKey: "driver.aadApp.error.generateSecretFailed",
};

@Service(actionName) // DO NOT MODIFY the service name
export class CreateAadAppDriver implements StepDriver {
  public async run(args: CreateAadAppArgs, context: DriverContext): Promise<Map<string, string>> {
    try {
      this.validateArgs(args);
      const aadAppClient = new AadAppClient(context.m365TokenProvider);
      const aadAppState = this.loadCurrentState();
      if (!aadAppState.AAD_APP_CLIENT_ID) {
        // Create new AAD app if no client id exists
        const aadApp = await aadAppClient.createAadApp(args.name);
        aadAppState.AAD_APP_CLIENT_ID = aadApp.appId!;
        aadAppState.AAD_APP_OBJECT_ID = aadApp.id!;
        await this.setAadEndpointInfo(context.m365TokenProvider, aadAppState);
      }

      if (args.generateClientSecret && !aadAppState.SECRET_AAD_APP_CLIENT_SECRET) {
        // Create new client secret if no client secret exists
        if (!aadAppState.AAD_APP_OBJECT_ID) {
          throw new MissingEnvUserError(
            actionName,
            "AAD_APP_OBJECT_ID",
            helpLink,
            driverConstants.generateSecretErrorMessageKey
          );
        }
        const secret = await aadAppClient.generateClientSecret(aadAppState.AAD_APP_OBJECT_ID);
        aadAppState.SECRET_AAD_APP_CLIENT_SECRET = secret;
      }

      return new Map(
        Object.entries(aadAppState) // convert each property to Map item
          .filter((item) => item[1] && item[1] !== "") // do not return Map item that is empty
      );
    } catch (error) {
      if (error instanceof UserError || error instanceof SystemError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        if (error.response!.status >= 400 && error.response!.status < 500) {
          throw new UnhandledUserError(actionName, JSON.stringify(error.response!.data), helpLink);
        } else {
          throw new UnhandledSystemError(actionName, JSON.stringify(error.response!.data));
        }
      }

      throw new UnhandledSystemError(actionName, JSON.stringify(error));
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
      throw new InvalidParameterUserError(actionName, invalidParameters, helpLink);
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
}
