import * as msft from "@microsoft/teams-js";
import * as microsoftTeams from "@microsoft/teams-js";

async function f1(x: msft.DialogInfo): Promise<msft.DialogInfo> {
  return x;
}

async function f2(x: microsoftTeams.DialogInfo): Promise<microsoftTeams.DialogInfo> {
  return x;
}

const x1: msft.DialogInfo | undefined = undefined;
const x2: microsoftTeams.DialogInfo | undefined = undefined;

if (!!x1) {
  const y1 = x1 as msft.DialogInfo;
  //const y2 = <msft.TaskInfo>x1;
}
if (!!x2) {
  const y1 = x2 as microsoftTeams.DialogInfo;
  //const y2 = <microsoftTeams.TaskInfo>x2;
}

class TestClass {
  private x1: msft.DialogInfo;
  private x2: microsoftTeams.DialogInfo;

  constructor(x1: msft.DialogInfo, x2: microsoftTeams.DialogInfo) {
    this.x1 = x1;
    this.x2 = x2;
  }
}

interface ITestInterface {
  x1: msft.DialogInfo;
  x2: microsoftTeams.DialogInfo;
}
