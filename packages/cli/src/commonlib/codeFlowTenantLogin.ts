// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccountInfo, Configuration, PublicClientApplication, TokenCache } from "@azure/msal-node";
import { LogLevel, SystemError, UserError } from "@microsoft/teamsfx-api";
import { Mutex } from "async-mutex";
import * as crypto from "crypto";
import express from "express";
import * as fs from "fs-extra";
import * as http from "http";
import { AddressInfo } from "net";
import open from "open";
import os from "os";
import * as path from "path";
import { TextType, colorize } from "../colorize";
import { UTF8, loadAccountId, saveAccountId } from "./cacheAccess";
import { azureLoginMessage, m365LoginMessage } from "./common/constant";
import CliCodeLogInstance from "./log";

class ErrorMessage {
  static readonly loginError: string = "LoginError";
  static readonly timeoutMessage: string = "Timeout waiting for code";
  static readonly portConflictMessage: string = "Timeout waiting for port";
  static readonly component: string = "LoginComponent";
}

interface Deferred<T> {
  resolve: (result: T | Promise<T>) => void;
  reject: (reason: any) => void;
}

export class CodeFlowTenantLogin {
  pca: PublicClientApplication;
  account: AccountInfo | undefined;
  /**
   * @deprecated will be removed after unify m365 login
   */
  scopes: string[];
  config: Configuration;
  port: number;
  mutex: Mutex;
  msalTokenCache: TokenCache;
  accountName: string | undefined;
  showMFA: boolean | undefined;

  constructor(scopes: string[], config: Configuration, port: number, accountName: string) {
    this.scopes = scopes;
    this.config = config;
    this.port = port;
    this.mutex = new Mutex();
    this.pca = new PublicClientApplication(this.config);
    this.msalTokenCache = this.pca.getTokenCache();
    this.accountName = accountName;
    this.showMFA = true;
  }

  async reloadCache() {
    if (this.accountName) {
      const accountCache = await loadAccountId(this.accountName);
      if (accountCache) {
        const dataCache = await this.msalTokenCache.getAccountByHomeId(accountCache);
        if (dataCache) {
          this.account = dataCache;
        }
      }
    }
  }

  async login(tenantId?: string): Promise<string> {
    const codeVerifier = CodeFlowTenantLogin.toBase64UrlEncoding(
      crypto.randomBytes(32).toString("base64")
    );
    const codeChallenge = CodeFlowTenantLogin.toBase64UrlEncoding(
      await CodeFlowTenantLogin.sha256(codeVerifier)
    );
    let serverPort = this.port;

    // try get an unused port
    const app = express();
    const server = app.listen(serverPort);
    serverPort = (server.address() as AddressInfo).port;

    const authCodeUrlParameters = {
      scopes: this.scopes,
      codeChallenge: codeChallenge,
      codeChallengeMethod: "S256",
      redirectUri: `http://localhost:${serverPort}`,
      prompt: "select_account",
    };

    let deferredRedirect: Deferred<string>;
    const redirectPromise: Promise<string> = new Promise<string>(
      (resolve, reject) => (deferredRedirect = { resolve, reject })
    );

    app.get("/", (req: express.Request, res: express.Response) => {
      const tokenRequest = {
        code: req.query.code as string,
        scopes: this.scopes,
        redirectUri: `http://localhost:${serverPort}`,
        codeVerifier: codeVerifier,
      };

      this.pca
        .acquireTokenByCode(tokenRequest)
        .then(async (response) => {
          if (response) {
            if (response.account) {
              await this.mutex?.runExclusive(async () => {
                this.account = response.account!;
                await saveAccountId(this.accountName!, this.account.homeAccountId);
              });
              deferredRedirect.resolve(response.accessToken);

              sendFile(
                res,
                path.join(__dirname, "./codeFlowResult/index.html"),
                "text/html; charset=utf-8",
                this.accountName!
              );
            }
          } else {
            throw new Error("get no response");
          }
        })
        .catch((error) => {
          CliCodeLogInstance.necessaryLog(LogLevel.Error, "[Login] " + error.message);
          deferredRedirect.reject(error);
          res.status(500).send(error);
        });
    });

    const codeTimer = setTimeout(() => {
      deferredRedirect.reject(
        new SystemError(
          ErrorMessage.component,
          ErrorMessage.loginError,
          ErrorMessage.timeoutMessage
        )
      );
    }, 5 * 60 * 1000);

    function cancelCodeTimer() {
      clearTimeout(codeTimer);
    }

    let accessToken = undefined;
    try {
      await this.startServer(server, serverPort);
      void this.pca.getAuthCodeUrl(authCodeUrlParameters).then((response: string) => {
        response += "#";
        if (this.accountName == "azure") {
          CliCodeLogInstance.outputInfo(
            azureLoginMessage + colorize(response, TextType.Hyperlink) + os.EOL
          );
        } else {
          CliCodeLogInstance.outputInfo(
            m365LoginMessage + colorize(response, TextType.Hyperlink) + os.EOL
          );
        }
        void open(response);
      });

      redirectPromise.then(cancelCodeTimer, cancelCodeTimer);
      accessToken = await redirectPromise;
    } finally {
      server.close();
    }

    return accessToken;
  }

  async logout(): Promise<boolean> {
    if (this.accountName) {
      const accounts = await this.msalTokenCache.getAllAccounts();
      if (accounts.length > 0) {
        accounts.forEach(async (accountInfo) => {
          await this.msalTokenCache.removeAccount(accountInfo);
        });
      }
      await saveAccountId(this.accountName, undefined);
    }
    return true;
  }

  async getToken(tenantId?: string): Promise<string | undefined> {
    try {
      if (!this.account && !tenantId) {
        await this.reloadCache();
      }
      if (!this.account) {
        const accessToken = await this.login(tenantId);
        return accessToken;
      } else {
        return this.pca
          .acquireTokenSilent({
            account: this.account,
            scopes: this.scopes,
            forceRefresh: false,
          })
          .then((response) => {
            if (response) {
              return response.accessToken;
            } else {
              return undefined;
            }
          })
          .catch(async (error) => {
            CliCodeLogInstance.necessaryLog(
              LogLevel.Error,
              "[Login] silent acquire token : " + error.message
            );
            await this.logout();
            const accessToken = await this.login();
            return accessToken;
          });
      }
    } catch (error: any) {
      CliCodeLogInstance.necessaryLog(LogLevel.Error, "[Login] " + error.message);
      throw LoginFailureError(error);
    }
  }

  async startServer(server: http.Server, port: number): Promise<string> {
    // handle port timeout
    let defferedPort: Deferred<string>;
    const portPromise: Promise<string> = new Promise<string>(
      (resolve, reject) => (defferedPort = { resolve, reject })
    );
    const portTimer = setTimeout(() => {
      defferedPort.reject(
        new SystemError(
          ErrorMessage.component,
          ErrorMessage.loginError,
          ErrorMessage.portConflictMessage
        )
      );
    }, 5000);

    function cancelPortTimer() {
      clearTimeout(portTimer);
    }

    server.on("listening", () => {
      defferedPort.resolve(`Code login server listening on port ${port}`);
    });
    portPromise.then(cancelPortTimer, cancelPortTimer);
    return portPromise;
  }

  static toBase64UrlEncoding(base64string: string) {
    return base64string.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }

  static sha256(s: string | Uint8Array): Promise<string> {
    return new Promise((solve) => solve(crypto.createHash("sha256").update(s).digest("base64")));
  }
}

function sendFile(
  res: http.ServerResponse,
  filepath: string,
  contentType: string,
  accountName: string
) {
  fs.readFile(filepath, (err, body) => {
    if (err) {
      CliCodeLogInstance.necessaryLog(LogLevel.Error, err.message);
    } else {
      let data = body.toString();
      data = data.replace(/\${accountName}/g, accountName == "azure" ? "Azure" : "M365");
      body = Buffer.from(data, UTF8);
      res.writeHead(200, {
        "Content-Length": body.length,
        "Content-Type": contentType,
      });
      res.end(body);
    }
  });
}

export function LoginFailureError(innerError?: any): UserError {
  return new UserError({
    name: "LoginFailure",
    message: "Cannot get user login information. Please login correct account via browser.",
    source: "Login",
    error: innerError,
  });
}

export function ConvertTokenToJson(token: string): any {
  const array = token.split(".");
  const buff = Buffer.from(array[1], "base64");
  return JSON.parse(buff.toString(UTF8));
}
