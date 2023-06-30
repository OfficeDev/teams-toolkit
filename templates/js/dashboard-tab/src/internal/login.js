import TeamsUserCredentialContextInstance from "./singletonContext";

export async function loginAction(scope) {
  try {
    var credential = TeamsUserCredentialContextInstance.getCredential();
    await credential.login(scope);
    TeamsUserCredentialContextInstance.setCredential(credential);
  } catch (e) {
    console.log(e);
    throw new Error("Login Error: can not login!");
  }
}
