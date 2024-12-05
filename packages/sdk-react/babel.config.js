module.exports = {
  assumptions: {
    constantReexports: true,
  },
  presets: [
    ["@babel/preset-env", { targets: { esmodules: true } }],
    ["@babel/preset-react", { runtime: "automatic" }],
    ["@babel/preset-typescript", { allowDeclareFields: true }],
  ],
};
