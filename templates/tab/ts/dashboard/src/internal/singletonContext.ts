import { TeamsUserCredential } from "@microsoft/teamsfx";

export class TeamsUserCredentialContext {
  private static instance: TeamsUserCredentialContext;
  private credential: TeamsUserCredential | undefined;
  private constructor() {}

  public static getInstance(): TeamsUserCredentialContext {
    if (!TeamsUserCredentialContext.instance) {
      TeamsUserCredentialContext.instance = new TeamsUserCredentialContext();
    }

    return TeamsUserCredentialContext.instance;
  }

  public setCredential(credential: TeamsUserCredential) {
    this.credential = credential;
  }

  public getCredential() {
    if (!this.credential) {
      this.credential = new TeamsUserCredential({
        initiateLoginEndpoint: process.env.initiateLoginEndpoint!,
        clientId: process.env.clientId!,
      });
    }
    return this.credential;
  }
}
