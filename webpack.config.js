const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')

const isProduction = !!process.env.production

module.exports = {
  // 入口，是一个对象
  entry: './src/screenshot.js',
  mode: 'development',
  output: {
    library: 'ScreenShot',
    libraryTarget: 'umd',
    libraryExport: 'default',
    path: path.resolve(__dirname, 'dist'),
    filename: 'screenshot.umd.js',
    clean: true
  },
  devtool: 'source-map',
  devServer: {
    static: './test',
    port: 8080
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      test: /\.m?js(\?.*)?$/i,
      terserOptions: {
        sourceMap: true,
        compress: {
          drop_console: !!isProduction,
          drop_debugger: !!isProduction
        }
      }
    })]
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    browsers: ['> 1%', 'last 2 version']
                  }
                }
              ]
            ],
            plugins: ['@babel/plugin-transform-runtime']
          }
        }
      },
      {
        test: /\.(sa|sc|c)ss$/i,
        use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
      }
    ]
  }
}
