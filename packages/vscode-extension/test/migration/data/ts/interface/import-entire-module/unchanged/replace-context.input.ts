import * as msft from "@microsoft/teams-js";

async function f1(x: msft.Context): Promise<msft.Context> {
  return x;
}

const x1: msft.Context | undefined = undefined;

if (!!x1) {
  const y1 = x1 as msft.Context;
  //const y2 = <Context>x1;
}

class TestClass {
  private x1: msft.Context;

  constructor(x1: msft.Context) {
    this.x1 = x1;
  }
}

interface ITestInterface {
  x1: msft.Context;
}
