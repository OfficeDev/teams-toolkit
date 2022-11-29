import { FxContext } from "./singletonContext";

export function loginAction(scope: string[]) {
  try {
    var teamsfx = FxContext.getInstance().getTeamsFx();
    teamsfx.login(scope);
    FxContext.getInstance().setTeamsFx(teamsfx);
  } catch (e) {
    console.log(e);
    throw "Login Error: can not login!";
  }
}
