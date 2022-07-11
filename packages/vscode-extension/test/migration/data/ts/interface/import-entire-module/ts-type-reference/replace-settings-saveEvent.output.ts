import msft from "@microsoft/teams-js";

async function f1(x: msft.pages.config.SaveEvent): Promise<msft.pages.config.SaveEvent> {
  return x;
}

const x1: msft.pages.config.SaveEvent | undefined = undefined;

if (!!x1) {
  const y1 = x1 as msft.pages.config.SaveEvent;
  //const y2 = <msft.settings.SaveEvent>x1;
}

class TestClass {
  private x1: msft.pages.config.SaveEvent;

  constructor(x1: msft.pages.config.SaveEvent) {
    this.x1 = x1;
  }
}

interface ITestInterface {
  x1: msft.pages.config.SaveEvent;
}
