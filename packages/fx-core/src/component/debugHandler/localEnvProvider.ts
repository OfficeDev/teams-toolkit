// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";

import { FolderName } from "../../common/local/constants";

export interface LocalEnvs {
  template: { [key: string]: string };
  teamsfx: { [key: string]: string };
  customized: { [key: string]: string };
}

export const LocalEnvKeys = Object.freeze({
  frontend: {
    template: {
      Browser: "BROWSER",
      Https: "HTTPS",
      Port: "PORT",
      SslCrtFile: "SSL_CRT_FILE",
      SslKeyFile: "SSL_KEY_FILE",
    },
    teamsfx: {
      ClientId: "REACT_APP_CLIENT_ID",
      LoginUrl: "REACT_APP_START_LOGIN_PAGE_URL",
      FuncEndpoint: "REACT_APP_FUNC_ENDPOINT",
      FuncName: "REACT_APP_FUNC_NAME",
    },
  },
  backend: {
    teamsfx: {
      ClientId: "M365_CLIENT_ID",
      ClientSecret: "M365_CLIENT_SECRET",
      TenantId: "M365_TENANT_ID",
      AuthorityHost: "M365_AUTHORITY_HOST",
      AllowedAppIds: "ALLOWED_APP_IDS",
      SqlEndpoint: "SQL_ENDPOINT",
      SqlDbName: "SQL_DATABASE_NAME",
      SqlUserName: "SQL_USER_NAME",
      SqlPassword: "SQL_PASSWORD",
      SqlIdentityId: "IDENTITY_ID",
    },
  },
  bot: {
    template: {
      BotId: "BOT_ID",
      BotPassword: "BOT_PASSWORD",
    },
    teamsfx: {
      ClientId: "M365_CLIENT_ID",
      ClientSecret: "M365_CLIENT_SECRET",
      TenantId: "M365_TENANT_ID",
      AuthorityHost: "M365_AUTHORITY_HOST",
      LoginEndpoint: "INITIATE_LOGIN_ENDPOINT",
      ApplicationIdUri: "M365_APPLICATION_ID_URI",
      ApiEndpoint: "API_ENDPOINT",
      SqlEndpoint: "SQL_ENDPOINT",
      SqlDbName: "SQL_DATABASE_NAME",
      SqlUserName: "SQL_USER_NAME",
      SqlPassword: "SQL_PASSWORD",
      SqlIdentityId: "IDENTITY_ID",
    },
  },
  videoFilterApp: {
    template: {
      SslCrtFile: "SSL_CRT_FILE",
      SslKeyFile: "SSL_KEY_FILE",
    },
    teamsfx: {},
  },
});

const frontendTemplateComment =
  "# TeamsFx will overwrite the following variable values when running debug. They are used by create-react-app.";
const botTemplateComment =
  "# TeamsFx will overwrite the following variable values when running debug. They are used by the bot code.";
const teamsfxComment =
  "# TeamsFx will overwrite the following variable values when running debug. They are used by TeamsFx SDK.";
const customizedComment =
  "# Following variables can be customized or you can add your owns." + os.EOL + "# FOO=BAR";
const videoFilterAppTemplateComment =
  "# TeamsFx will overwrite the following variable values when running debug. They are used by Vite.";

export class LocalEnvProvider {
  public static readonly LocalEnvFileName: string = ".env.teamsfx.local";

  private readonly projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  public async loadFrontendLocalEnvs(): Promise<LocalEnvs> {
    return await this.loadLocalEnvFile(
      path.join(this.projectPath, FolderName.Frontend, LocalEnvProvider.LocalEnvFileName),
      Object.values(LocalEnvKeys.frontend.template),
      Object.values(LocalEnvKeys.frontend.teamsfx)
    );
  }

  public async loadBackendLocalEnvs(): Promise<LocalEnvs> {
    return await this.loadLocalEnvFile(
      path.join(this.projectPath, FolderName.Function, LocalEnvProvider.LocalEnvFileName),
      [],
      Object.values(LocalEnvKeys.backend.teamsfx)
    );
  }

  public async loadBotLocalEnvs(): Promise<LocalEnvs> {
    return await this.loadLocalEnvFile(
      path.join(this.projectPath, FolderName.Bot, LocalEnvProvider.LocalEnvFileName),
      Object.values(LocalEnvKeys.bot.template),
      Object.values(LocalEnvKeys.bot.teamsfx)
    );
  }

  public async loadVideoFilterLocalEnvs(): Promise<LocalEnvs> {
    return await this.loadLocalEnvFile(
      path.join(this.projectPath, FolderName.VideoFilter, LocalEnvProvider.LocalEnvFileName),
      Object.values(LocalEnvKeys.videoFilterApp.template),
      Object.values(LocalEnvKeys.videoFilterApp.teamsfx)
    );
  }

  public async saveFrontendLocalEnvs(envs: LocalEnvs): Promise<string> {
    return await this.saveLocalEnvFile(
      path.join(this.projectPath, FolderName.Frontend),
      envs,
      frontendTemplateComment,
      teamsfxComment,
      customizedComment
    );
  }

  public async saveBackendLocalEnvs(envs: LocalEnvs): Promise<string> {
    return await this.saveLocalEnvFile(
      path.join(this.projectPath, FolderName.Function),
      envs,
      undefined,
      teamsfxComment,
      customizedComment
    );
  }

  public async saveBotLocalEnvs(envs: LocalEnvs): Promise<string> {
    return await this.saveLocalEnvFile(
      path.join(this.projectPath, FolderName.Bot),
      envs,
      botTemplateComment,
      teamsfxComment,
      customizedComment
    );
  }

  public async saveVideoFilterLocalEnvs(envs: LocalEnvs): Promise<string> {
    return await this.saveLocalEnvFile(
      path.join(this.projectPath, FolderName.VideoFilter),
      envs,
      videoFilterAppTemplateComment,
      teamsfxComment,
      customizedComment
    );
  }

  private async loadLocalEnvFile(
    path: string,
    templateKeys: string[],
    teamsfxKeys: string[]
  ): Promise<LocalEnvs> {
    const result: LocalEnvs = {
      template: {},
      teamsfx: {},
      customized: {},
    };
    if (await fs.pathExists(path)) {
      const envs = dotenv.parse(await fs.readFile(path));

      const entries = Object.entries(envs);
      for (const [key, value] of entries) {
        if (templateKeys.includes(key)) {
          result.template[key] = value;
        } else if (teamsfxKeys.includes(key)) {
          result.teamsfx[key] = value;
        } else {
          result.customized[key] = value;
        }
      }
    }
    return result;
  }

  private async saveLocalEnvFile(
    folder: string,
    envs: LocalEnvs,
    templateComment?: string,
    teamsfxComment?: string,
    customizedComment?: string
  ): Promise<string> {
    await fs.ensureDir(folder);
    const envPath = path.join(folder, LocalEnvProvider.LocalEnvFileName);
    await fs.createFile(envPath);
    await fs.writeFile(envPath, "");

    let needEOL = false;

    if (Object.keys(envs.template).length > 0) {
      if (templateComment) {
        await fs.appendFile(envPath, `${templateComment}${os.EOL}`);
      }
      const templateEntries = Object.entries(envs.template);
      for (const [key, value] of templateEntries) {
        await fs.appendFile(envPath, `${key}=${value}${os.EOL}`);
      }
      needEOL = true;
    }

    if (Object.keys(envs.teamsfx).length > 0) {
      if (needEOL) {
        await fs.appendFile(envPath, os.EOL);
      }
      if (teamsfxComment) {
        await fs.appendFile(envPath, `${teamsfxComment}${os.EOL}`);
      }
      const teamsfxEntries = Object.entries(envs.teamsfx);
      for (const [key, value] of teamsfxEntries) {
        await fs.appendFile(envPath, `${key}=${value}${os.EOL}`);
      }
      needEOL = true;
    }

    if (needEOL) {
      await fs.appendFile(envPath, os.EOL);
    }
    if (customizedComment) {
      await fs.appendFile(envPath, `${customizedComment}${os.EOL}`);
    }
    if (Object.keys(envs.customized).length > 0) {
      const customizedEntries = Object.entries(envs.customized);
      for (const [key, value] of customizedEntries) {
        await fs.appendFile(envPath, `${key}=${value}${os.EOL}`);
      }
    }

    return envPath;
  }
}
