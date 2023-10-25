// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Service } from "typedi";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { getLocalizedString } from "../../../common/localizeUtils";
import { CreateApiSecretArgs } from "./interface/createApiSecretArgs";
import { DriverContext } from "../interface/commonArgs";
import { M365TokenProvider, UserError, err, ok } from "@microsoft/teamsfx-api";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { hooks } from "@feathersjs/hooks/lib";
import { InvalidActionInputError } from "../../../error";
import { logMessageKeys } from "./utilities/constants";
import { OutputEnvironmentVariableUndefinedError } from "../error/outputEnvironmentVariableUndefinedError";
import { ApiSecret, ApiSecretClientSecret } from "./interface/apiSecret";
import { GraphScopes } from "../../../common/tools";
import { CreateApiSecretOutputs } from "./interface/createApiSecretOutputs";

const actionName = "apiSecret/create"; // DO NOT MODIFY the name
const helpLink = "https://aka.ms/teamsfx-actions/apiSecret-create";

@Service(actionName) // DO NOT MODIFY the service name
export class CreateApiSecretDriver implements StepDriver {
  description = getLocalizedString(logMessageKeys.description);
  readonly progressTitle = getLocalizedString(logMessageKeys.progessTitle);

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async execute(
    args: CreateApiSecretArgs,
    context: DriverContext,
    outputEnvVarNames?: Map<string, string>
  ): Promise<ExecutionResult> {
    const summaries: string[] = [];
    let outputs: Map<string, string> = new Map<string, string>();

    try {
      context.logProvider?.info(getLocalizedString(logMessageKeys.startExecuteDriver, actionName));
      this.validateArgs(args);

      if (!outputEnvVarNames) {
        throw new OutputEnvironmentVariableUndefinedError(actionName);
      }

      const state = this.loadStateFromEnv(outputEnvVarNames) as CreateApiSecretOutputs;
      if (state.registrationId) {
        // Registration aleady exists. Will check if registration id exists.
      } else {
        // Registe a new api secret
        const createApiSecretInputs = await this.parseArgs(context.m365TokenProvider, args);

        // TODO: call app studio api
        state.registrationId = "fake-registration-id";

        // TODO: remove test code
        context.logProvider.info("createApiSecretInputs: " + JSON.stringify(createApiSecretInputs));
      }

      outputs = this.mapStateToEnv(state, outputEnvVarNames);
      return {
        result: ok(outputs),
        summaries: summaries,
      };
    } catch (error) {
      // Error handling
      return {
        result: err(error as UserError),
        summaries: summaries,
      };
    }
  }

  private validateArgs(args: CreateApiSecretArgs): void {
    const invalidParameters: string[] = [];
    if (typeof args.name !== "string" || !args.name) {
      invalidParameters.push("name");
    }

    if (typeof args.appId !== "string" || !args.appId) {
      invalidParameters.push("appId");
    }

    if (args.apiSecret && typeof args.apiSecret !== "string") {
      invalidParameters.push("apiSecret");
    }

    if (invalidParameters.length > 0) {
      throw new InvalidActionInputError(actionName, invalidParameters, helpLink);
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

  // Needs to validate the parameters outside of the function
  private mapStateToEnv(
    state: Record<string, string>,
    outputEnvVarNames: Map<string, string>
  ): Map<string, string> {
    const result = new Map<string, string>();
    for (const [outputName, envVarName] of outputEnvVarNames) {
      result.set(envVarName, state[outputName]);
    }
    return result;
  }

  private async parseArgs(
    tokenProvider: M365TokenProvider,
    args: CreateApiSecretArgs
  ): Promise<ApiSecret> {
    const currentUserRes = await tokenProvider.getJsonObject({ scopes: GraphScopes });
    if (currentUserRes.isErr()) {
      throw currentUserRes.error;
    }
    const currentUser = currentUserRes.value;
    const userId = currentUser["oid"] as string;

    const secrets = this.parseSecret(args.apiSecret!);
    let isPrimary = true;
    const clientSecrets = secrets.map((secret) => {
      const clientSecret: ApiSecretClientSecret = {
        value: secret,
        description: args.name,
        priority: isPrimary ? 0 : 1,
      };
      isPrimary = false;
      return clientSecret;
    });

    const apiSecret: ApiSecret = {
      description: args.name,
      targetUrlsShouldStartWith: [],
      applicableToApps: "SpecificApp",
      specificAppId: args.appId,
      targetAudience: "AnyTenant",
      clientSecret: clientSecrets,
      manageableByUser: [
        {
          userId: userId,
          accessType: "ReadWrite",
        },
      ],
    };

    return apiSecret;
  }

  // Allowed inputs: "[secrets1, secrets2]", "secret"
  private parseSecret(apiSecret: string): string[] {
    const secrets = apiSecret.trim().replace("[", "").replace("]", "").split(",");
    return secrets;
  }
}
