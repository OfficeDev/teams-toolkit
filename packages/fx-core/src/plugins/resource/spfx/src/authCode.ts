// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// TODO: move it to core(commonlib)
import {
  PublicClientApplication,
  LogLevel,
  AccountInfo,
} from "@azure/msal-node";
import * as express from "express";
import * as http from "http";
import * as crypto from "crypto";
import {
  DialogMsg,
  DialogType,
  PluginContext,
  QuestionType,
  returnSystemError,
} from "teamsfx-api";

const config = {
  auth: {
    clientId: "beb6eae1-ae6d-452c-b27c-8c5b61f206b2",
    authority: "https://login.microsoftonline.com/common",
  },
  system: {
    loggerOptions: {
      // @ts-ignore
      loggerCallback(loglevel, message, containsPii) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Verbose,
    },
  },
};

const SERVER_PORT = 19000;

interface Deferred<T> {
  resolve: (result: T | Promise<T>) => void;
  reject: (reason: any) => void;
}
class ErrorMessage {
  static readonly loginError: string = "LoginError";
  static readonly timeoutMessage: string = "Timeout waiting for code";
  static readonly portConflictMessage: string = "Timeout waiting for port";
  static readonly component: string = "LoginComponent";
}
export class AuthCode {
  private static pca: PublicClientApplication;
  static account: AccountInfo | undefined;
  private static codeVerifier: string;
  private static codeChallenge: string;

  static logout() {
    this.account = undefined;
  }

  static async login(ctx: PluginContext): Promise<string> {
    this.codeVerifier = this.toBase64UrlEncoding(
      crypto.randomBytes(32).toString("base64")
    );
    this.codeChallenge = this.toBase64UrlEncoding(
      await this.sha256(this.codeVerifier)
    );

    this.pca = new PublicClientApplication(config);
    const authCodeUrlParameters = {
      scopes: [
        "https://microsoft.sharepoint-df.com/AllSites.FullControl",
        "https://graph.microsoft.com/User.Read",
      ],
      redirectUri: `http://localhost:${SERVER_PORT}/redirect`,
      codeChallenge: this.codeChallenge,
      codeChallengeMethod: "S256",
    };

    let deferredRedirect: Deferred<string>;
    let redirectPromise: Promise<string> = new Promise<string>(
      (resolve, reject) => (deferredRedirect = { resolve, reject })
    );

    const app = express.default();
    app.get("/redirect", (req: express.Request, res: express.Response) => {
      const tokenRequest = {
        code: req.query.code as string,
        scopes: ["User.Read"],
        redirectUri: `http://localhost:${SERVER_PORT}/redirect`,
        codeVerifier: this.codeVerifier,
      };

      this.pca
        .acquireTokenByCode(tokenRequest)
        .then((response) => {
          if (response) {
            if (response.account) {
              this.account = response.account;
              deferredRedirect.resolve(response.accessToken);
              res.sendStatus(200);
            }
          } else {
            throw new Error("get no response");
          }
        })
        .catch((error) => {
          console.log(error);
          deferredRedirect.reject(error);
          res.status(500).send(error);
        });
    });

    const server = app.listen(SERVER_PORT);
    const httpClose = require("http-close");
    httpClose({ timeout: 1 }, server);
    let token = undefined;
    try {
      const response = await this.startServer(server);

      // authcode
      this.pca
        .getAuthCodeUrl(authCodeUrlParameters)
        .then(async (response: string) => {
          await ctx.dialog?.communicate(
            new DialogMsg(DialogType.Ask, {
              type: QuestionType.OpenExternal,
              description: response,
            })
          );
        });

      // token
      const codeTimer = setTimeout(() => {
        deferredRedirect.reject(
          returnSystemError(
            new Error(ErrorMessage.timeoutMessage),
            ErrorMessage.component,
            ErrorMessage.loginError
          )
        );
      }, 2 * 60 * 1000);

      function cancelCodeTimer() {
        clearTimeout(codeTimer);
      }

      redirectPromise.then(cancelCodeTimer, cancelCodeTimer);
      token = await redirectPromise;
    } finally {
      server.close();
    }

    return token;
  }

  static async getToken(ctx: PluginContext, scopes: string[]): Promise<string> {
    if (!this.account) {
      return this.login(ctx);
    } else {
      return this.pca
        .acquireTokenSilent({
          account: this.account,
          scopes: scopes,
          forceRefresh: false,
        })
        .then((response) => {
          if (response) {
            return response.accessToken;
          } else {
            throw new Error("getToken response empty");
          }
        });
    }
  }

  private static async startServer(server: http.Server): Promise<string> {
    // handle port timeout
    let defferedPort: Deferred<string>;
    let portPromise: Promise<string> = new Promise<string>(
      (resolve, reject) => (defferedPort = { resolve, reject })
    );
    let portTimer = setTimeout(() => {
      defferedPort.reject(
        returnSystemError(
          new Error(ErrorMessage.portConflictMessage),
          ErrorMessage.component,
          ErrorMessage.loginError
        )
      );
    }, 5000);

    function cancelPortTimer() {
      clearTimeout(portTimer);
    }

    server.on("listening", () => {
      defferedPort.resolve(`Auth Code server listening on port ${SERVER_PORT}`);
    });
    portPromise.then(cancelPortTimer, cancelPortTimer);
    return portPromise;
  }

  private static toBase64UrlEncoding(base64string: string) {
    return base64string
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }

  private static sha256(s: string | Uint8Array): Promise<string> {
    return require("crypto").createHash("sha256").update(s).digest("base64");
  }
}
