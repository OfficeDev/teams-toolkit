import { TeamsUserCredential } from "@microsoft/teamsfx";

let instance;

class TeamsUserCredentialContext {
  credential;
  constructor() {
    if (instance) {
      throw new Error("FxContext is a singleton class, use getInstance() instead.");
    }
    instance = this;
  }

  setCredential(credential) {
    this.credential = credential;
  }

  getCredential() {
    if (!this.credential) {
      this.credential =  new TeamsUserCredential({
        initiateLoginEndpoint: process.env.initiateLoginEndpoint,
        clientId: process.env.clientId,
      });
    }
    return this.credential;
  }
}

let FxContextInstance = Object.freeze(new TeamsUserCredentialContext());

export default FxContextInstance;
