import { TeamsFx } from "@microsoft/teamsfx";

let instance;

class FxContext {
  teamsfx;
  constructor() {
    if (instance) {
      throw new Error("FxContext is a singleton class, use getInstance() instead.");
    }
    instance = this;
  }

  setTeamsFx(teamsfx) {
    this.teamsfx = teamsfx;
  }

  getTeamsFx() {
    if (!this.teamsfx) {
      this.teamsfx = new TeamsFx();
    }
    return this.teamsfx;
  }
}

let FxContextInstance = Object.freeze(new FxContext());

export default FxContextInstance;
