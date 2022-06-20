import * as path123 from "path";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class Foo {
  async bar() {
    await delay(1000);
    path123.join("a", "b");
  }

  baz() {
    path123.join("a", "b");
  }

  async buz(arg: string, arg2: any) {
    await delay(1000);
    await this.bar();
  }
}

process.env.METAOS_TRACE_ID = "123";
const f = new Foo();
f.buz("Hello World!", { a: 1 }).then();
