import * as microsoftTeams from "@microsoft/teams-js";
import "@microsoft/teams-js";

async function f1(x: microsoftTeams.settings.Settings): Promise<microsoftTeams.settings.Settings> {
  return x;
}

async function f2(x: microsoftTeams.settings.Settings): Promise<microsoftTeams.settings.Settings> {
  return x;
}

const x1: microsoftTeams.settings.Settings | undefined = undefined;
const x2: microsoftTeams.settings.Settings | undefined = undefined;

if (!!x1) {
  const y1 = x1 as microsoftTeams.settings.Settings;
  //const y2 = <microsoftTeams.settings.Settings>x1;
}
if (!!x2) {
  const y1 = x2 as microsoftTeams.settings.Settings;
  //const y2 = <microsoftTeams.settings.Settings>x2;
}

class TestClass {
  private x1: microsoftTeams.settings.Settings;
  private x2: microsoftTeams.settings.Settings;

  constructor(x1: microsoftTeams.settings.Settings, x2: microsoftTeams.settings.Settings) {
    this.x1 = x1;
    this.x2 = x2;
  }
}

interface ITestInterface {
  x1: microsoftTeams.settings.Settings;
  x2: microsoftTeams.settings.Settings;
}
