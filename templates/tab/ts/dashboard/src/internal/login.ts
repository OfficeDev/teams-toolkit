import { FxContext } from "./singletonContext";

export async function loginAction(scope: string[]) {
  try {
    var teamsfx = FxContext.getInstance().getTeamsFx();
    await teamsfx.login(scope);
    FxContext.getInstance().setTeamsFx(teamsfx);
  } catch (e) {
    console.log(e);
    throw "Login Error: can not login!";
  }
}
