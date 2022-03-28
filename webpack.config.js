const path = require("path");

module.exports = {
  // 入口，是一个对象
  entry: "./src/screenshot.js",
  output: {
    library: "screenshot",
    libraryTarget: "umd",
    path: path.resolve(__dirname, "dist"),
    filename: "screenshot.min.js",
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    browsers: ["> 1%", "last 2 version"],
                  },
                },
              ],
            ],
          },
        },
      },
    ],
  },
};
