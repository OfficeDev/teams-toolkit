import { TeamsUserCredentialContext } from "./singletonContext";

export async function loginAction(scope: string[]) {
  try {
    var credential = TeamsUserCredentialContext.getInstance().getCredential();
    await credential.login(scope);
    TeamsUserCredentialContext.getInstance().setCredential(credential);
  } catch (e) {
    console.log(e);
    throw "Login Error: can not login!";
  }
}
