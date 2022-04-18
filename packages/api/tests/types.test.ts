// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { assert } from "chai";
import { ConfigMap, OptionItem } from "../src";

describe("Types", () => {
  it("ConfigMap", () => {
    const configMap = new ConfigMap();
    configMap.set("k", "hello");
    assert.isTrue(configMap.getString("k") === "hello");

    configMap.set("k", 0.1);
    assert.isTrue(configMap.getNumber("k") === 0.1);

    configMap.set("k", true);
    assert.isTrue(configMap.getBoolean("k") === true);

    configMap.set("k", ["a", "b"]);
    assert.sameOrderedMembers(configMap.getStringArray("k") as string[], ["a", "b"]);

    configMap.set("k", [1, 2]);
    assert.sameOrderedMembers(configMap.getNumberArray("k") as number[], [1, 2]);

    configMap.set("k", [true, false]);
    assert.sameOrderedMembers(configMap.getBooleanArray("k") as boolean[], [true, false]);

    configMap.set("k", [
      { id: "1", label: "l1" },
      { id: "2", label: "l2" },
    ] as OptionItem[]);
    const items = configMap.getOptionItemArray("k") as OptionItem[];
    assert.deepEqual(items[0], { id: "1", label: "l1" });
    assert.deepEqual(items[1], { id: "2", label: "l2" });

    configMap.set("k", { id: "1", label: "l1" } as OptionItem);
    assert.deepEqual(configMap.getOptionItem("k") as OptionItem, { id: "1", label: "l1" });

    const json = configMap.toJSON();
    assert.deepEqual(json, { k: { id: "1", label: "l1" } });

    const configMap2 = ConfigMap.fromJSON(json);
    assert.isTrue(configMap2 !== undefined);
    assert.deepEqual(
      configMap.getOptionItem("k") as OptionItem,
      configMap2!.getOptionItem("k") as OptionItem
    );
    assert.isTrue(configMap2!.size === 1);
  });
});
