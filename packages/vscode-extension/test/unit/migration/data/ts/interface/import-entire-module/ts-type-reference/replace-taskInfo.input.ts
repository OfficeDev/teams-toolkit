import * as msft from "@microsoft/teams-js";
import "@microsoft/teams-js";

async function f1(x: msft.TaskInfo): Promise<msft.TaskInfo> {
  return x;
}

async function f2(x: microsoftTeams.TaskInfo): Promise<microsoftTeams.TaskInfo> {
  return x;
}

const x1: msft.TaskInfo | undefined = undefined;
const x2: microsoftTeams.TaskInfo | undefined = undefined;

if (!!x1) {
  const y1 = x1 as msft.TaskInfo;
  //const y2 = <msft.TaskInfo>x1;
}
if (!!x2) {
  const y1 = x2 as microsoftTeams.TaskInfo;
  //const y2 = <microsoftTeams.TaskInfo>x2;
}

class TestClass {
  private x1: msft.TaskInfo;
  private x2: microsoftTeams.TaskInfo;

  constructor(x1: msft.TaskInfo, x2: microsoftTeams.TaskInfo) {
    this.x1 = x1;
    this.x2 = x2;
  }
}

interface ITestInterface {
  x1: msft.TaskInfo;
  x2: microsoftTeams.TaskInfo;
}
