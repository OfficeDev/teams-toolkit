import * as microsoftTeams from "@microsoft/teams-js";

interface ITestContext extends microsoftTeams.pages.config.SaveEvent {
  x: number;
}

class TestContext implements microsoftTeams.pages.config.SaveEvent {
  result: microsoftTeams.pages.config.SaveParameters;
  notifySuccess(): void {
    throw new Error("Method not implemented.");
  }
  notifyFailure(reason?: string): void {
    throw new Error("Method not implemented.");
  }
}
