// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { UserError, err, ok, CLICommand } from "@microsoft/teamsfx-api";
import AzureTokenProvider from "../../commonlib/azureLogin";
import {
  codeFlowLoginFormat,
  loginComponent,
  servicePrincipalLoginFormat,
  usageError,
} from "../../commonlib/common/constant";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { accountUtils } from "./accountShow";

export const accountLoginAzureCommand: CLICommand = {
  name: "azure",
  description: "Log in to Azure account.",
  options: [
    {
      name: "tenant",
      description: "Authenticate with a specific Microsoft Entra tenant.",
      type: "string",
      default: "",
    },
    {
      name: "service-principal",
      description: "Authenticate Azure with a credential representing a service principal",
      type: "boolean",
      default: false,
    },
    {
      name: "username",
      shortName: "u",
      description: "Client ID for service principal",
      type: "string",
      default: "",
    },
    {
      name: "password",
      shortName: "p",
      description: "Provide client secret or a pem file with key and public certificate.",
      type: "string",
      default: "",
    },
  ],
  examples: [
    {
      command: `${process.env.TEAMSFX_CLI_BIN_NAME} auth login azure --interactive false --service-principal -u USERNAME  -p SECRET --tenant TENANT_ID`,
      description: "Log in with a service principal using client secret",
    },
    {
      command: `${process.env.TEAMSFX_CLI_BIN_NAME} auth login azure --interactive false --service-principal -u USERNAME  -p "C:/Users/mycertfile.pem" --tenant TENANT_ID`,
      description: "Log in with a service principal using client certificate",
    },
  ],
  telemetry: {
    event: TelemetryEvent.AccountLoginAzure,
  },
  handler: async (ctx) => {
    const args = ctx.optionValues;
    const isSP = args["service-principal"] as boolean;
    if (isSP === true) {
      if (!args.username || !args.password || !args.tenant) {
        return err(new UserError(loginComponent, usageError, servicePrincipalLoginFormat));
      }
    } else {
      if (args.username || args.password || args.tenant) {
        return err(new UserError(loginComponent, usageError, codeFlowLoginFormat));
      }
    }
    await AzureTokenProvider.signout();
    await accountUtils.outputAzureInfo(
      "login",
      args.tenant as string,
      isSP,
      args.username as string,
      args.password as string
    );
    return ok(undefined);
  },
};
