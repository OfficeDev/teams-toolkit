import * as path123 from "path";
import { MSTimer } from "@microsoft/metrics-ts";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class Foo {
  @MSTimer(__filename)
  bar() {
    const r = this.baz();
    console.log(r);
    console.log(r.indexOf(0));
  }

  @MSTimer(__filename)
  baz(): number[] {
    path123.join("a", "b");
    return [1];
  }

  @MSTimer(__filename)
  async buz(arg: string, arg2: any) {
    await delay(1000);
    this.bar();
  }
}

process.env.METAOS_TRACE_ID = "123";
const f = new Foo();
f.buz("Hello World!", { a: 1 }).then();
