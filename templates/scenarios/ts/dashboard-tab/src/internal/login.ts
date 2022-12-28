import { TeamsUserCredentialContext } from "./singletonContext";

export async function loginAction(scope: string[]) {
  try {
    const credential = TeamsUserCredentialContext.getInstance().getCredential();
    await credential.login(scope);
    TeamsUserCredentialContext.getInstance().setCredential(credential);
  } catch (e) {
    console.log(e);
    throw "Login Error: can not login!";
  }
}
