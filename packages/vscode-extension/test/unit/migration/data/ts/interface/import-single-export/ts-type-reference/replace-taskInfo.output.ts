import { DialogInfo } from "@microsoft/teams-js";

async function f1(x: DialogInfo): Promise<DialogInfo> {
  return x;
}

async function f2(x: DialogInfo): Promise<DialogInfo> {
  return x;
}

const x1: DialogInfo | undefined = undefined;
const x2: DialogInfo | undefined = undefined;

if (!!x1) {
  const y1 = x1 as DialogInfo;
  //const y2 = <TaskInfo>x1;
}
if (!!x2) {
  const y1 = x2 as DialogInfo;
  //const y2 = <TaskInfoAlias>x2;
}

class TestClass {
  private x1: DialogInfo;
  private x2: DialogInfo;

  constructor(x1: DialogInfo, x2: DialogInfo) {
    this.x1 = x1;
    this.x2 = x2;
  }
}

interface ITestInterface {
  x1: DialogInfo;
  x2: DialogInfo;
}
