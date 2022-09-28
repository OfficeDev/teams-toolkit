// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { StepDriver } from "../../interface/stepDriver";
import { DriverContext } from "../../interface/driverContext";
import { Service } from "typedi";
import { CreateAadAppArgs } from "./interface/createAadAppArgs";
import { AadAppClient } from "./utility/aadAppClient";
import { CreateAadAppOutput } from "./interface/createAadAppOutput";
import { M365TokenProvider, UserError } from "@microsoft/teamsfx-api";
import { GraphScopes } from "../../../common/tools";
import { Constants } from "../../resource/aadApp/constants";
import * as DriverConstants from "./constants";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";

const actionName = "aadApp/create"; // DO NOT MODIFY the name
const helpLink = "https://aka.ms/teamsfx-actions/aadapp-create";

@Service(actionName) // DO NOT MODIFY the service name
export class CreateAadAppDriver implements StepDriver {
  public async run(args: CreateAadAppArgs, context: DriverContext): Promise<Map<string, string>> {
    this.validateArgs(args);
    const aadAppClient = new AadAppClient(context.m365TokenProvider);
    const aadAppState = this.loadCurrentState();

    if (!aadAppState.AAD_APP_CLIENT_ID) {
      // Create new AAD app if no client id exists
      const aadApp = await aadAppClient.createAadApp(args.name);
      aadAppState.AAD_APP_CLIENT_ID = aadApp.appId!;
      aadAppState.AAD_APP_OBJECT_ID = aadApp.id!;
      this.setAadEndpointInfo(context.m365TokenProvider, aadAppState);
    }

    if (args.genegerateClientSecret && !aadAppState.SECRET_AAD_APP_CLIENT_SECRET) {
      // Create new client secret if no client secret exists
      if (!aadAppState.AAD_APP_OBJECT_ID) {
        throw new UserError({
          source: actionName,
          name: DriverConstants.missingEnvError.errorCode,
          message: getDefaultString(
            DriverConstants.missingEnvError.messageKey,
            getDefaultString(DriverConstants.generateSecretError.messageKey),
            "AAD_APP_OBJECT_ID"
          ),
          displayMessage: getLocalizedString(
            DriverConstants.missingEnvError.messageKey,
            getLocalizedString(DriverConstants.generateSecretError.messageKey),
            "AAD_APP_OBJECT_ID"
          ),
          helpLink: helpLink,
        });
      }
      const secret = await aadAppClient.generateClientSecret(aadAppState.AAD_APP_OBJECT_ID);
      aadAppState.SECRET_AAD_APP_CLIENT_SECRET = secret;
    }

    return new Map(
      Object.entries(aadAppState) // convert each property to Map item
        .filter((item) => item[1] && item[1] !== "") // do not return Map item that is empty
    );
  }

  private validateArgs(args: CreateAadAppArgs): void {
    const invalidParameters: string[] = [];
    if (!args.name) {
      invalidParameters.push("name");
    }

    if (args.genegerateClientSecret === undefined) {
      invalidParameters.push("genegerateClientSecret");
    }

    if (invalidParameters.length > 0) {
      const invalidParametersString = invalidParameters.join(",");
      throw new UserError({
        source: actionName,
        name: DriverConstants.invalidParameterError.errorCode,
        message: getDefaultString(
          DriverConstants.invalidParameterError.messageKey,
          actionName,
          invalidParametersString
        ),
        displayMessage: getLocalizedString(
          DriverConstants.invalidParameterError.messageKey,
          actionName,
          invalidParametersString
        ),
        helpLink: helpLink,
      });
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
  public async setAadEndpointInfo(tokenProvider: M365TokenProvider, state: CreateAadAppOutput) {
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
