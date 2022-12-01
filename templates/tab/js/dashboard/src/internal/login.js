import FxContextInstance from "./singletonContext";

export async function loginAction(scope) {
  try {
    var teamsfx = FxContextInstance.getTeamsFx();
    await teamsfx.login(scope);
    FxContextInstance.setTeamsFx(teamsfx);
  } catch (e) {
    console.log(e);
    throw "Login Error: can not login!";
  }
}
