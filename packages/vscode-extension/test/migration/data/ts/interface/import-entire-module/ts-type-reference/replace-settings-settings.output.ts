import * as microsoftTeams from "@microsoft/teams-js";

async function f1(x: microsoftTeams.pages.config.Config): Promise<microsoftTeams.pages.config.Config> {
  return x;
}

async function f2(x: microsoftTeams.pages.config.Config): Promise<microsoftTeams.pages.config.Config> {
  return x;
}

const x1: microsoftTeams.pages.config.Config | undefined = undefined;
const x2: microsoftTeams.pages.config.Config | undefined = undefined;

if (!!x1) {
  const y1 = x1 as microsoftTeams.pages.config.Config;
  //const y2 = <microsoftTeams.settings.Settings>x1;
}
if (!!x2) {
  const y1 = x2 as microsoftTeams.pages.config.Config;
  //const y2 = <microsoftTeams.settings.Settings>x2;
}

class TestClass {
  private x1: microsoftTeams.pages.config.Config;
  private x2: microsoftTeams.pages.config.Config;

  constructor(x1: microsoftTeams.pages.config.Config, x2: microsoftTeams.pages.config.Config) {
    this.x1 = x1;
    this.x2 = x2;
  }
}

interface ITestInterface {
  x1: microsoftTeams.pages.config.Config;
  x2: microsoftTeams.pages.config.Config;
}