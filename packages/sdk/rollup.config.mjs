import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import pkg from "./package.json" assert { type: "json" };

const deps = Object.keys(Object.assign({}, pkg.peerDependencies, pkg.dependencies));

const nodeDeps = [...deps, "crypto", "fs", "path", "https"];

/**
 * ES5 Builds
 */
const es5BuildPlugins = [typescript(), json(), terser()];

/**
 * ES2017 Builds
 */
const es2017Plugins = [
  typescript({
    compilerOptions: {
      target: "es2017",
    },
  }),
  json({ preferConst: true }),
  terser(),
];

const es5Builds = [
  /**
   * Browser Builds
   */
  {
    input: "src/index.browser.ts",
    output: [{ file: pkg.esm5, format: "es", sourcemap: true }],
    external: (id) => deps.some((dep) => id === dep || id.startsWith(`${dep}/`)),
    plugins: [...es5BuildPlugins],
    treeshake: {
      moduleSideEffects: false,
    },
  },
  /**
   * Node.js Build
   */
  {
    input: "src/index.ts",
    output: [{ file: pkg.main, format: "cjs", sourcemap: true }],
    external: (id) => nodeDeps.some((dep) => id === dep || id.startsWith(`${dep}/`)),
    plugins: [typescript(), json(), terser()],
  },
];

const es2017Builds = [
  // Node
  {
    input: "./src/index.ts",
    output: {
      file: pkg.module,
      format: "es",
      sourcemap: true,
    },
    external: (id) => nodeDeps.some((dep) => id === dep || id.startsWith(`${dep}/`)),
    plugins: [...es2017Plugins],
  },
];

export default [...es5Builds, ...es2017Builds];
