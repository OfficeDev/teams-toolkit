import * as base from "./rollup.base.config";

const inputs = [];

if (!process.env.ONLY_BROWSER) {
  inputs.push(base.nodeConfig({ test: true }));
}

if (!process.env.ONLY_NODE) {
  inputs.push(base.browserConfig("unit"));
  inputs.push(base.browserConfig("integration"));
}

export default inputs;
