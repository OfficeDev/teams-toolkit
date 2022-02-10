import { it, describe } from "mocha";
import { expect } from "chai";

import { jsonStringifyElegantly } from "../../../src/core/pvm/utility";

describe("Plugin Version Manager: Utility", async () => {
  it("stringify result should be elegant", async () => {
    const obj = {
      a: 123,
      b: "b",
      c: {
        d: true,
        e: [1, 2, 3],
      },
    };
    expect(jsonStringifyElegantly(obj)).equals(
      '{\n  "a": 123,\n  "b": "b",\n  "c": {\n    "d": true,\n    "e": [\n      1,\n      2,\n      3\n    ]\n  }\n}'
    );
  });
});
