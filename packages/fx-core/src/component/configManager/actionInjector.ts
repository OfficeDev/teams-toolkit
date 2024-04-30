// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Utils } from "@microsoft/m365-spec-parser";
import fs from "fs-extra";
import { parseDocument } from "yaml";
import { InjectAPIKeyActionFailedError, InjectOAuthActionFailedError } from "../../error/common";

export class ActionInjector {
  static hasActionWithName(provisionNode: any, action: string, name: string): any {
    const hasAuthAction = provisionNode.items.some(
      (item: any) => item.get("uses") === action && item.get("with")?.get("name") === name
    );
    return hasAuthAction;
  }

  static getTeamsAppIdEnvName(provisionNode: any): string | undefined {
    for (const item of provisionNode.items) {
      if (item.get("uses") === "teamsApp/create") {
        return item.get("writeToEnvironmentFile")?.get("teamsAppId") as string;
      }
    }

    return undefined;
  }

  static generateAuthAction(
    actionName: string,
    authName: string,
    teamsAppIdEnvName: string,
    specRelativePath: string,
    envName: string,
    flow?: string
  ): any {
    const result: any = {
      uses: actionName,
      with: {
        name: `${authName}`,
        appId: `\${{${teamsAppIdEnvName}}}`,
        apiSpecPath: specRelativePath,
      },
    };

    if (flow) {
      result.with.flow = flow;
      result.writeToEnvironmentFile = {
        configurationId: envName,
      };
    } else {
      result.writeToEnvironmentFile = {
        registrationId: envName,
      };
    }

    return result;
  }

  static async injectCreateOAuthAction(
    ymlPath: string,
    authName: string,
    specRelativePath: string
  ): Promise<void> {
    const ymlContent = await fs.readFile(ymlPath, "utf-8");
    const actionName = "oauth/register";

    const document = parseDocument(ymlContent);
    const provisionNode = document.get("provision") as any;
    if (provisionNode) {
      const hasOAuthAction = ActionInjector.hasActionWithName(provisionNode, actionName, authName);
      if (!hasOAuthAction) {
        provisionNode.items = provisionNode.items.filter(
          (item: any) => item.get("uses") !== actionName && item.get("uses") !== "apiKey/register"
        );
        const teamsAppIdEnvName = ActionInjector.getTeamsAppIdEnvName(provisionNode);
        if (teamsAppIdEnvName) {
          const index: number = provisionNode.items.findIndex(
            (item: any) => item.get("uses") === "teamsApp/create"
          );
          const envName = Utils.getSafeRegistrationIdEnvName(`${authName}_CONFIGURATION_ID`);
          const flow = "authorizationCode";
          const action = ActionInjector.generateAuthAction(
            actionName,
            authName,
            teamsAppIdEnvName,
            specRelativePath,
            envName,
            flow
          );
          provisionNode.items.splice(index + 1, 0, action);
        } else {
          throw new InjectOAuthActionFailedError();
        }

        await fs.writeFile(ymlPath, document.toString(), "utf8");
      }
    } else {
      throw new InjectOAuthActionFailedError();
    }
  }

  static async injectCreateAPIKeyAction(
    ymlPath: string,
    authName: string,
    specRelativePath: string
  ): Promise<void> {
    const ymlContent = await fs.readFile(ymlPath, "utf-8");
    const actionName = "apiKey/register";

    const document = parseDocument(ymlContent);
    const provisionNode = document.get("provision") as any;

    if (provisionNode) {
      const hasApiKeyAction = ActionInjector.hasActionWithName(provisionNode, actionName, authName);

      if (!hasApiKeyAction) {
        provisionNode.items = provisionNode.items.filter(
          (item: any) => item.get("uses") !== actionName && item.get("uses") !== "oauth/register"
        );
        const teamsAppIdEnvName = ActionInjector.getTeamsAppIdEnvName(provisionNode);
        if (teamsAppIdEnvName) {
          const index: number = provisionNode.items.findIndex(
            (item: any) => item.get("uses") === "teamsApp/create"
          );
          const envName = Utils.getSafeRegistrationIdEnvName(`${authName}_REGISTRATION_ID`);
          const action = ActionInjector.generateAuthAction(
            actionName,
            authName,
            teamsAppIdEnvName,
            specRelativePath,
            envName
          );
          provisionNode.items.splice(index + 1, 0, action);
        } else {
          throw new InjectAPIKeyActionFailedError();
        }

        await fs.writeFile(ymlPath, document.toString(), "utf8");
      }
    } else {
      throw new InjectAPIKeyActionFailedError();
    }
  }
}
