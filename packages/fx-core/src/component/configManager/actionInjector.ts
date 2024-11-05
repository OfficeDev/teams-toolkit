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
    specRelativePath: string,
    forceToAddNew: boolean // If it from add plugin, then we will add another CreateOAuthAction
  ): Promise<AuthActionInjectResult | undefined> {
    const ymlContent = await fs.readFile(ymlPath, "utf-8");
    const actionName = "oauth/register";

    const document = parseDocument(ymlContent);
    const provisionNode = document.get("provision") as any;
    if (provisionNode) {
      const hasOAuthAction = ActionInjector.hasActionWithName(provisionNode, actionName, authName);
      if (!hasOAuthAction || forceToAddNew) {
        provisionNode.items = provisionNode.items.filter((item: any) => {
          const uses = item.get("uses");
          if (forceToAddNew) {
            return uses;
          } else {
            return uses !== actionName && uses !== "apiKey/register";
          }
        });
        const existingConfigurationIdEnvNames: string[] = provisionNode.items
          .filter((item: any) => {
            const uses = item.get("uses");
            return uses == actionName;
          })
          .map((item: any) => item.get("writeToEnvironmentFile")?.get("configurationId"))
          .filter((item: string | undefined) => {
            return !!item;
          });
        const defaultEnvName = Utils.getSafeRegistrationIdEnvName(`${authName}_CONFIGURATION_ID`);
        const registrationIdEnvName = this.findNextAvailableEnvName(
          defaultEnvName,
          existingConfigurationIdEnvNames
        );
        const teamsAppIdEnvName = ActionInjector.getTeamsAppIdEnvName(provisionNode);
        if (teamsAppIdEnvName) {
          const index: number = provisionNode.items.findIndex(
            (item: any) => item.get("uses") === "teamsApp/create"
          );

          const flow = "authorizationCode";
          const action = ActionInjector.generateAuthAction(
            actionName,
            authName,
            teamsAppIdEnvName,
            specRelativePath,
            registrationIdEnvName,
            flow
          );
          provisionNode.items.splice(index + 1, 0, action);
        } else {
          throw new InjectOAuthActionFailedError();
        }

        await fs.writeFile(ymlPath, document.toString(), "utf8");
        return {
          defaultRegistrationIdEnvName: defaultEnvName,
          registrationIdEnvName: registrationIdEnvName,
        };
      }
    } else {
      throw new InjectOAuthActionFailedError();
    }

    return undefined;
  }

  static async injectCreateAPIKeyAction(
    ymlPath: string,
    authName: string,
    specRelativePath: string,
    forceToAddNew: boolean // If it from add plugin, then we will add another CreateApiKeyAction
  ): Promise<AuthActionInjectResult | undefined> {
    const ymlContent = await fs.readFile(ymlPath, "utf-8");
    const actionName = "apiKey/register";

    const document = parseDocument(ymlContent);
    const provisionNode = document.get("provision") as any;

    if (provisionNode) {
      const hasApiKeyAction = ActionInjector.hasActionWithName(provisionNode, actionName, authName);

      if (!hasApiKeyAction || forceToAddNew) {
        provisionNode.items = provisionNode.items.filter((item: any) => {
          const uses = item.get("uses");
          if (forceToAddNew) {
            return uses;
          } else {
            return uses !== actionName && uses !== "oauth/register";
          }
        });
        const existingRegistrationIdEnvNames: string[] = provisionNode.items
          .filter((item: any) => {
            const uses = item.get("uses");
            return uses == actionName;
          })
          .map((item: any) => item.get("writeToEnvironmentFile")?.get("registrationId"))
          .filter((item: string | undefined) => {
            return !!item;
          });
        const teamsAppIdEnvName = ActionInjector.getTeamsAppIdEnvName(provisionNode);
        const defaultEnvName = Utils.getSafeRegistrationIdEnvName(`${authName}_REGISTRATION_ID`);
        const registrationIdEnvName = this.findNextAvailableEnvName(
          defaultEnvName,
          existingRegistrationIdEnvNames
        );
        if (teamsAppIdEnvName) {
          const index: number = provisionNode.items.findIndex(
            (item: any) => item.get("uses") === "teamsApp/create"
          );
          const action = ActionInjector.generateAuthAction(
            actionName,
            authName,
            teamsAppIdEnvName,
            specRelativePath,
            registrationIdEnvName
          );
          provisionNode.items.splice(index + 1, 0, action);
        } else {
          throw new InjectAPIKeyActionFailedError();
        }

        await fs.writeFile(ymlPath, document.toString(), "utf8");
        return {
          defaultRegistrationIdEnvName: defaultEnvName,
          registrationIdEnvName: registrationIdEnvName,
        };
      }
    } else {
      throw new InjectAPIKeyActionFailedError();
    }
    return undefined;
  }

  static findNextAvailableEnvName(baseEnvName: string, existingEnvNames: string[]): string {
    let suffix = 1;
    let envName = baseEnvName;
    while (existingEnvNames.includes(envName)) {
      envName = `${baseEnvName}${suffix}`;
      suffix++;
    }
    return envName;
  }
}

export interface AuthActionInjectResult {
  defaultRegistrationIdEnvName: string | undefined; // The default registration id env name without suffix
  registrationIdEnvName: string | undefined; // The real env name of registration id we write in the yaml file
}
