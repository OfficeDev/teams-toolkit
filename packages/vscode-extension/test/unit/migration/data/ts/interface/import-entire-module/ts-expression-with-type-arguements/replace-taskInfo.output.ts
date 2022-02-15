import msft from "@microsoft/teams-js";

interface ITestContext extends msft.DialogInfo {
  x: number;
}

class TestContext implements msft.DialogInfo {}
