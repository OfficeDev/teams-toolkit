import { pages } from "@microsoft/teams-js";

async function f1(x: pages.config.Config): Promise<pages.config.Config> {
  return x;
}

async function f2(x: pages.config.Config): Promise<pages.config.Config> {
  return x;
}

const x1: pages.config.Config | undefined = undefined;
const x2: pages.config.Config | undefined = undefined;

if (!!x1) {
  const y1 = x1 as pages.config.Config;
  //const y2 = <settings.Settings>x1;
}
if (!!x2) {
  const y1 = x2 as pages.config.Config;
  //const y2 = <settingsAlias.Settings>x2;
}

class TestClass {
  private x1: pages.config.Config;
  private x2: pages.config.Config;

  constructor(x1: pages.config.Config, x2: pages.config.Config) {
    this.x1 = x1;
    this.x2 = x2;
  }
}

interface ITestInterface {
  x1: pages.config.Config;
  x2: pages.config.Config;
}
