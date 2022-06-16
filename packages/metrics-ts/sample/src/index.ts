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
}

const f = new Foo();
f.bar().then();
f.baz();
