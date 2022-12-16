import { TeamsUserCredential } from "@microsoft/teamsfx";

let instance;

class TeamsUserCredentialContext {
  constructor() {
    if (instance) {
      throw new Error("TeamsUserCredentialContext is a singleton class, use TeamsUserCredentialContextInstance instead.");
    }
    instance = this;
  }

  setCredential(credential) {
    this.credential = credential;
  }

  getCredential() {
    if (!this.credential) {
      this.credential =  new TeamsUserCredential({
        initiateLoginEndpoint: process.env.REACT_APP_START_LOGIN_PAGE_URL,
        clientId: process.env.REACT_APP_CLIENT_ID,
      });
    }
    return this.credential;
  }
}

let TeamsUserCredentialContextInstance = new TeamsUserCredentialContext();

export default TeamsUserCredentialContextInstance;