import { DialogInfo } from "@microsoft/teams-js";

interface ITestContext extends DialogInfo {
  x: number;
}

class TestContext implements DialogInfo {}

interface ITestContextAlias extends DialogInfo {
  x: number;
}

class TestContextAlias implements DialogInfo {}
