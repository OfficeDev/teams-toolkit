import msft from "@microsoft/teams-js";

interface ITestContext extends msft.TaskInfo {
  x: number;
}

class TestContext implements msft.TaskInfo {}
