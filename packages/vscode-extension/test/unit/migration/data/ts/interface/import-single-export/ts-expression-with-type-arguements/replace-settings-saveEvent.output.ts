import { pages } from "@microsoft/teams-js";

interface ITestContext extends pages.config.SaveEvent {
  x: number;
}

class TestContext implements pages.config.SaveEvent {
  result: pages.config.SaveParameters;
  notifySuccess(): void {
    throw new Error("Method not implemented.");
  }
  notifyFailure(reason?: string): void {
    throw new Error("Method not implemented.");
  }
}

interface ITestContextAlias extends pages.config.SaveEvent {
  x: number;
}

class TestContextAlias implements pages.config.SaveEvent {
  result: pages.config.SaveParameters;
  notifySuccess(): void {
    throw new Error("Method not implemented.");
  }
  notifyFailure(reason?: string): void {
    throw new Error("Method not implemented.");
  }
}
