import * as msft from "@microsoft/teams-js";

async function f1(x: msft.Context): Promise<msft.Context> {
  return x;
}

async function f2(x: msft.settings.Settings): Promise<msft.settings.Settings> {
  return x;
}

const x1: msft.Context | undefined = undefined;
const x2: msft.settings.Settings | undefined = undefined;

if (!!x1) {
  const y1 = x1 as msft.Context;
  const y2 = <msft.Context>x1;
}
if (!!x2) {
  const y1 = x2 as msft.settings.Settings;
  const y2 = <msft.settings.Settings>x2;
}

class TestClass {
  private x1: msft.Context;
  private x2: msft.settings.Settings;

  constructor(x1: msft.Context, x2: msft.settings.Settings) {
    this.x1 = x1;
    this.x2 = x2;
  }
}

interface ITestInterface {
  x1: msft.Context;
  x2: msft.settings.Settings;
}
