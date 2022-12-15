import TeamsUserCredentialContextInstance from "./singletonContext";

export async function loginAction(scope) {
  try {
    var credential = TeamsUserCredentialContextInstance.getInstance().getCredential();
    await credential.login(scope);
    TeamsUserCredentialContextInstance.getInstance().setCredential(credential);
  } catch (e) {
    console.log(e);
    throw "Login Error: can not login!";
  }
}
