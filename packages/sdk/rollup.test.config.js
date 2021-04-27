import * as base from "./rollup.base.config";

const inputs = [];

if (!process.env.ONLY_BROWSER) {
  inputs.push(base.nodeConfig({ unit: true }));
}

if (!process.env.ONLY_NODE) {
  inputs.push(base.browserConfig(true, false));
  inputs.push(base.browserConfig(false, true));
}

export default inputs;
