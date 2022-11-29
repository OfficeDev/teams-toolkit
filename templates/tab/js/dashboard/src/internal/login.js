import FxContextInstance from "./singletonContext";

export function loginAction(scope) {
  try {
    var teamsfx = FxContextInstance.getTeamsFx();
    teamsfx.login(scope);
    FxContextInstance.setTeamsFx(teamsfx);
  } catch (e) {
    console.log(e);
    throw "Login Error: can not login!";
  }
}
