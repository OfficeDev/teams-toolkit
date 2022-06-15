import { join } from "path";
class Foo {
  bar() {
    console.log(join("a", "b"));
  }
}

const f = new Foo();
f.bar();
