// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { FrontendHostingPlugin, FunctionPlugin, BotPlugin } from "./constants";

export interface LocalEnvs {
  teamsfxLocalEnvs: { [key: string]: string };
  customizedLocalEnvs: { [name: string]: string };
}

export const EnvKeysFrontend = Object.freeze({
  Browser: "BROWSER",
  Https: "HTTPS",
  SslCrtFile: "SSL_CRT_FILE",
  SslKeyFile: "SSL_KEY_FILE",
  TeamsFxEndpoint: "REACT_APP_TEAMSFX_ENDPOINT",
  LoginUrl: "REACT_APP_START_LOGIN_PAGE_URL",
  FuncEndpoint: "REACT_APP_FUNC_ENDPOINT",
  FuncName: "REACT_APP_FUNC_NAME",
  ClientId: "REACT_APP_CLIENT_ID",
});

export const EnvKeysBackend = Object.freeze({
  WebJobsStorage: "AzureWebJobsStorage",
  FuncWorkerRuntime: "FUNCTIONS_WORKER_RUNTIME",
  AuthorityHost: "M365_AUTHORITY_HOST",
  TenantId: "M365_TENANT_ID",
  ClientId: "M365_CLIENT_ID",
  ClientSecret: "M365_CLIENT_SECRET",
  ApiEndpoint: "API_ENDPOINT",
  ApplicationIdUri: "M365_APPLICATION_ID_URI",
  AllowedAppIds: "ALLOWED_APP_IDS",
});

export const EnvKeysBackendCustom = Object.freeze({
  SqlEndpoint: "SQL_ENDPOINT",
  SqlDbName: "SQL_DATABASE_NAME",
  SqlUserName: "SQL_USER_NAME",
  SqlPassword: "SQL_PASSWORD",
});

export const EnvKeysBot = Object.freeze({
  BotId: "BOT_ID",
  BotPassword: "BOT_PASSWORD",
  ClientId: "M365_CLIENT_ID",
  ClientSecret: "M365_CLIENT_SECRET",
  TenantID: "M365_TENANT_ID",
  OauthAuthority: "M365_AUTHORITY_HOST",
  LoginEndpoint: "INITIATE_LOGIN_ENDPOINT",
  ApiEndpoint: "API_ENDPOINT",
  ApplicationIdUri: "M365_APPLICATION_ID_URI",
});

export const EnvKeysBotV1 = Object.freeze({
  BotId: "BotId",
  BotPassword: "BotPassword",
});

export const EnvKeysBotCustom = Object.freeze({
  SqlEndpoint: "SQL_ENDPOINT",
  SqlDbName: "SQL_DATABASE_NAME",
  SqlUserName: "SQL_USER_NAME",
  SqlPassword: "SQL_PASSWORD",
});

// Manage local envs for multi-env project. For legacy supported one, see `localEnv.ts`.
export class LocalEnvMultiProvider {
  public static readonly LocalEnvFileName: string = ".env.teamsfx.local";

  private readonly projectRoot: string;

  constructor(workspaceFolder: string) {
    this.projectRoot = workspaceFolder;
  }

  public async loadFrontendLocalEnvs(
    includeBackend: boolean,
    includeAuth: boolean
  ): Promise<LocalEnvs> {
    const envs = await this.loadLocalEnvFile(
      path.join(
        this.projectRoot,
        FrontendHostingPlugin.FolderName,
        LocalEnvMultiProvider.LocalEnvFileName
      ),
      Object.values(EnvKeysFrontend)
    );

    return envs ?? this.initFrontendLocalEnvs(includeBackend, includeAuth);
  }

  public async loadBackendLocalEnvs(): Promise<LocalEnvs> {
    const envs = await this.loadLocalEnvFile(
      path.join(
        this.projectRoot,
        FunctionPlugin.FolderName,
        LocalEnvMultiProvider.LocalEnvFileName
      ),
      Object.values(EnvKeysBackend)
    );

    return envs ?? this.initBackendLocalEnvs();
  }

  public async loadBotLocalEnvs(isMigrateFromV1: boolean): Promise<LocalEnvs> {
    const envs = await this.loadLocalEnvFile(
      path.join(this.projectRoot, BotPlugin.FolderName, LocalEnvMultiProvider.LocalEnvFileName),
      Object.values(EnvKeysBot)
    );

    return envs ?? this.initBotLocalEnvs(isMigrateFromV1);
  }

  public async saveLocalEnvs(
    frontendEnvs: LocalEnvs | undefined,
    backendEnvs: LocalEnvs | undefined,
    botEnvs: LocalEnvs | undefined
  ): Promise<void> {
    if (frontendEnvs !== undefined) {
      await this.saveLocalEnvFile(
        path.join(this.projectRoot, FrontendHostingPlugin.FolderName),
        frontendEnvs
      );
    }

    if (backendEnvs !== undefined) {
      await this.saveLocalEnvFile(
        path.join(this.projectRoot, FunctionPlugin.FolderName),
        backendEnvs
      );
    }

    if (botEnvs !== undefined) {
      await this.saveLocalEnvFile(path.join(this.projectRoot, BotPlugin.FolderName), botEnvs);
    }
  }

  public initFrontendLocalEnvs(includeBackend: boolean, includeAuth: boolean): LocalEnvs {
    const result: LocalEnvs = {
      teamsfxLocalEnvs: {},
      customizedLocalEnvs: {},
    };

    result.teamsfxLocalEnvs[EnvKeysFrontend.Browser] = "none";
    result.teamsfxLocalEnvs[EnvKeysFrontend.Https] = "true";

    if (includeAuth) {
      result.teamsfxLocalEnvs[EnvKeysFrontend.TeamsFxEndpoint] = "";
      result.teamsfxLocalEnvs[EnvKeysFrontend.LoginUrl] = "";
      result.teamsfxLocalEnvs[EnvKeysFrontend.ClientId] = "";
    }

    if (includeBackend) {
      result.teamsfxLocalEnvs[EnvKeysFrontend.FuncEndpoint] = "";
      result.teamsfxLocalEnvs[EnvKeysFrontend.FuncName] = "";
    }

    return result;
  }

  public initBackendLocalEnvs(): LocalEnvs {
    const result: LocalEnvs = {
      teamsfxLocalEnvs: {},
      customizedLocalEnvs: {},
    };

    result.teamsfxLocalEnvs[EnvKeysBackend.WebJobsStorage] = "";
    result.teamsfxLocalEnvs[EnvKeysBackend.FuncWorkerRuntime] = "node";
    result.teamsfxLocalEnvs[EnvKeysBackend.AuthorityHost] = "";
    result.teamsfxLocalEnvs[EnvKeysBackend.TenantId] = "";
    result.teamsfxLocalEnvs[EnvKeysBackend.ClientId] = "";
    result.teamsfxLocalEnvs[EnvKeysBackend.ClientSecret] = "";
    result.teamsfxLocalEnvs[EnvKeysBackend.ApiEndpoint] = "";
    result.teamsfxLocalEnvs[EnvKeysBackend.ApplicationIdUri] = "";
    result.teamsfxLocalEnvs[EnvKeysBackend.AllowedAppIds] = "";

    result.customizedLocalEnvs[EnvKeysBackendCustom.SqlEndpoint] = "";
    result.customizedLocalEnvs[EnvKeysBackendCustom.SqlDbName] = "";
    result.customizedLocalEnvs[EnvKeysBackendCustom.SqlUserName] = "";
    result.customizedLocalEnvs[EnvKeysBackendCustom.SqlPassword] = "";

    return result;
  }

  public initBotLocalEnvs(isMigrateFromV1: boolean): LocalEnvs {
    const result: LocalEnvs = {
      teamsfxLocalEnvs: {},
      customizedLocalEnvs: {},
    };

    if (isMigrateFromV1) {
      result.teamsfxLocalEnvs[EnvKeysBotV1.BotId] = "";
      result.teamsfxLocalEnvs[EnvKeysBotV1.BotPassword] = "";
    } else {
      result.teamsfxLocalEnvs[EnvKeysBot.BotId] = "";
      result.teamsfxLocalEnvs[EnvKeysBot.BotPassword] = "";
      result.teamsfxLocalEnvs[EnvKeysBot.ClientId] = "";
      result.teamsfxLocalEnvs[EnvKeysBot.ClientSecret] = "";
      result.teamsfxLocalEnvs[EnvKeysBot.TenantID] = "";
      result.teamsfxLocalEnvs[EnvKeysBot.OauthAuthority] = "";
      result.teamsfxLocalEnvs[EnvKeysBot.LoginEndpoint] = "";
      result.teamsfxLocalEnvs[EnvKeysBot.ApiEndpoint] = "";
      result.teamsfxLocalEnvs[EnvKeysBot.ApplicationIdUri] = "";

      result.customizedLocalEnvs[EnvKeysBotCustom.SqlEndpoint] = "";
      result.customizedLocalEnvs[EnvKeysBotCustom.SqlDbName] = "";
      result.customizedLocalEnvs[EnvKeysBotCustom.SqlUserName] = "";
      result.customizedLocalEnvs[EnvKeysBotCustom.SqlPassword] = "";
    }

    return result;
  }

  private async loadLocalEnvFile(
    path: string,
    teamsfxKeys: string[]
  ): Promise<LocalEnvs | undefined> {
    if (await fs.pathExists(path)) {
      const envs = dotenv.parse(await fs.readFile(path));
      const result: LocalEnvs = {
        teamsfxLocalEnvs: {},
        customizedLocalEnvs: {},
      };
      const entries = Object.entries(envs);
      for (const [key, value] of entries) {
        if (teamsfxKeys.includes(key)) {
          result.teamsfxLocalEnvs[key] = value;
        } else {
          result.customizedLocalEnvs[key] = value;
        }
      }

      return result;
    } else {
      return undefined;
    }
  }

  private async saveLocalEnvFile(folder: string, envs: LocalEnvs): Promise<void> {
    await fs.ensureDir(folder);
    const envPath = path.join(folder, LocalEnvMultiProvider.LocalEnvFileName);
    await fs.createFile(envPath);

    await fs.writeFile(envPath, `# Following variables are generated by TeamsFx${os.EOL}`);
    const teamsfxEntries = Object.entries(envs.teamsfxLocalEnvs);
    for (const [key, value] of teamsfxEntries) {
      await fs.appendFile(envPath, `${key}=${value}${os.EOL}`);
    }

    await fs.appendFile(
      envPath,
      `${os.EOL}# Following variables can be customized or you can add your owns${os.EOL}# FOO=BAR${os.EOL}`
    );
    const customizedEntries = Object.entries(envs.customizedLocalEnvs);
    for (const [key, value] of customizedEntries) {
      await fs.appendFile(envPath, `${key}=${value}${os.EOL}`);
    }
  }
}
