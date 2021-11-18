import { settings } from "@microsoft/teams-js";

async function f1(x: settings.SaveEvent): Promise<settings.SaveEvent> {
  return x;
}

const x1: settings.SaveEvent | undefined = undefined;

if (!!x1) {
  const y1 = x1 as settings.SaveEvent;
  //const y2 = <settings.SaveEvent>x1;
}

class TestClass {
  private x1: settings.SaveEvent;

  constructor(x1: settings.SaveEvent) {
    this.x1 = x1;
  }
}

interface ITestInterface {
  x1: settings.SaveEvent;
}
