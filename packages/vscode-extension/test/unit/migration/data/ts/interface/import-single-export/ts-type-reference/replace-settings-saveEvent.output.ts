import { pages } from "@microsoft/teams-js";

async function f1(x: pages.config.SaveEvent): Promise<pages.config.SaveEvent> {
  return x;
}

const x1: pages.config.SaveEvent | undefined = undefined;

if (!!x1) {
  const y1 = x1 as pages.config.SaveEvent;
  //const y2 = <settings.SaveEvent>x1;
}

class TestClass {
  private x1: pages.config.SaveEvent;

  constructor(x1: pages.config.SaveEvent) {
    this.x1 = x1;
  }
}

interface ITestInterface {
  x1: pages.config.SaveEvent;
}
