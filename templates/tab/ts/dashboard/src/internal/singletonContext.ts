import { TeamsFx } from "@microsoft/teamsfx";

export class FxContext {
  private static instance: FxContext;
  private teamsfx: TeamsFx | undefined;
  private constructor() {}

  public static getInstance(): FxContext {
    if (!FxContext.instance) {
      FxContext.instance = new FxContext();
    }

    return FxContext.instance;
  }

  public setTeamsFx(teamsfx: TeamsFx) {
    this.teamsfx = teamsfx;
  }

  public getTeamsFx() {
    if (!this.teamsfx) {
      this.teamsfx = new TeamsFx();
    }
    return this.teamsfx;
  }
}
