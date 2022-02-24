# Extra Shot Mocha

This package is an extension of [Mocha](https://mochajs.org/).

## Install

```shell
npm install --save-dev @microsoft/extra-shot-mocha

```

## Features

- support for custom data to "it"

### it

Sometimes, we're gonna add extra data to our test cases and show it in the report. You can use this "it" to replace mocha.it.

(Currently, this depends on [Mochawesome](https://github.com/adamgruber/mochawesome) as reporter. We'll develop a new reporter later.)

```typescript
import it from "@microsoft/extra-shot-mocha";
import { describe } from "mocha";
import { expect } from "chai";

describe("extra shot mocha it tests", async () => {
  it("should run as normal mocha.it with sync arrow function", () => {
    expect(1).equals(1);
  });

  it("should run as normal mocha.it with async arrow function", async () => {
    expect(1).equals(1);
  });

  it("should inject ctx with async function", { a: 1 }, async function () {
    expect(1).equals(1);
  });

  it("should inject ctx with async arrow function", { a: 1 }, async () => {
    expect(1).equals(1);
  });

  it("should inject ctx with sync function", { a: 1 }, function () {
    expect(1).equals(1);
  });

  it("should inject ctx with sync arrow function", { a: 1 }, () => {
    expect(1).equals(1);
  });
});
```

## License

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under the [MIT](LICENSE.txt) license.
