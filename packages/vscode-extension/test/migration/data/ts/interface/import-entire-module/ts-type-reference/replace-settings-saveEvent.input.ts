import msft from "@microsoft/teams-js";

async function f1(x: msft.settings.SaveEvent): Promise<msft.settings.SaveEvent> {
  return x;
}

const x1: msft.settings.SaveEvent | undefined = undefined;

if (!!x1) {
  const y1 = x1 as msft.settings.SaveEvent;
  //const y2 = <msft.settings.SaveEvent>x1;
}

class TestClass {
  private x1: msft.settings.SaveEvent;

  constructor(x1: msft.settings.SaveEvent) {
    this.x1 = x1;
  }
}

interface ITestInterface {
  x1: msft.settings.SaveEvent;
}
