const path = require('path')
const webpack = require('webpack')
const merge = require('webpack-merge')
// 清除目录等
const cleanWebpackPlugin = require('clean-webpack-plugin')
//4.x之后用以压缩
var OptimizeCSSPlugin = require('optimize-css-assets-webpack-plugin')
const ParallelUglifyPlugin = require('webpack-parallel-uglify-plugin')
const webpackConfigBase = require('./webpack.base.conf')
const webpackConfigProd = {
  mode: 'production', // 通过 mode 声明生产环境
  // mode: 'development', // 通过 mode 声明开发环境
  devtool: 'none',
  plugins: [
    new cleanWebpackPlugin({
      verbose: false, //开启在控制台输出信息
      dry: false,
    }),
    //压缩css
    new OptimizeCSSPlugin({ cssProcessorOptions: { safe: true } }),
    new ParallelUglifyPlugin({
      cacheDir: '.cache/',
      uglifyJS: {
        // output: {
        //   beautify: false,
        //   comments: false,
        // },
        // compress: {
        //   drop_console: true,
        //   drop_debugger: true, //去掉debugger
        //   collapse_vars: true,
        //   reduce_vars: true,
        //   global_defs: {
        //     '@alert': 'console.log', // 去掉alert
        //   },
        // },
        // warnings: false,
      },
    }),
  ],
  module: {
    rules: [],
  },
}

module.exports = merge(webpackConfigBase, webpackConfigProd)
