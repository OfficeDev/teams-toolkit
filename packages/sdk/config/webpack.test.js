module.exports = {
  mode: "development",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            compilerOptions: {
              module: "commonjs",
              target: "es2017",
              downlevelIteration: true,
              resolveJsonModule: true,
            },
          },
        },
      },
      {
        test: /\.[tj]sx?$/,
        exclude: /node_modules/,
        use: "source-map-loader",
        enforce: "pre",
      },
    ],
  },
  resolve: {
    modules: ["node_modules"],
    mainFields: ["browser", "module", "main"],
    extensions: [".js", ".ts"],
    symlinks: false,
    fallback: {
      util: false,
    },
  },
  plugins: [],
};
