import "@microsoft/teams-js";

interface ITestContext extends microsoftTeams.settings.SaveEvent {
  x: number;
}

class TestContext implements microsoftTeams.settings.SaveEvent {
  result: microsoftTeams.settings.SaveParameters;
  notifySuccess(): void {
    throw new Error("Method not implemented.");
  }
  notifyFailure(reason?: string): void {
    throw new Error("Method not implemented.");
  }
}
