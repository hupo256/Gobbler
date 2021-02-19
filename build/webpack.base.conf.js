const path = require('path')
const webpack = require('webpack')
const glob = require('glob')
//消除冗余的css
const purifyCssWebpack = require('purifycss-webpack')
// html模板
const htmlWebpackPlugin = require('html-webpack-plugin')
//静态资源输出
const copyWebpackPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const env = process.argv[process.argv.length - 1]
const devMode = process.env.GBL_ENV !== 'production'
const resolve = dir => path.join(__dirname, dir)
const rules = require('./webpack.rules.conf.js')
let entrys = getEntry('./src/pages/')

let apiUrl, baseUrl, envVars
/** 在该文件下配置项目基本参数 */
if (env === 'develop' || /feature-.?/.test(env)) {
  apiUrl = 'https://api-dev.meizhilab.com/rpasource/gobbler'
  baseUrl = 'https://dev.meizhilab.com/rpasource/gobbler/option/'
} else if (env === 'release-alpha') {
  apiUrl = 'https://api-test.meizhilab.com/rpasource/gobbler'
  baseUrl = 'https://alpha.datapollo.com/rpasource/gobbler/option/'
} else if (env === 'release-beta') {
  envVars = 'release-beta'
} else if (env === 'master') {
  envVars = 'master'
} else {
  envVars = 'local'
}

module.exports = {
  entry: entrys,
  output: {
    path: path.resolve(__dirname, '../dist'),
    // 打包多出口文件
    filename: './js/[name].js',
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.(c|le)ss$/,
        loaders: ['style-loader', 'css-loader', 'less-loader'],
      },
      ...rules,
    ],
  },
  resolve: {
    alias: {
      '@src': resolve('../src'),
      '@assets': resolve('../src/assets'),
    },
    extensions: ['.js', '.jsx', '.ts'],
  },
  plugins: [
    new MiniCssExtractPlugin(),
    // 全局暴露统一入口
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
    }),
    //静态资源输出
    new copyWebpackPlugin([
      {
        from: path.resolve(__dirname, '../src/assets'),
        to: './assets',
        ignore: ['.*'],
      },
      {
        from: path.resolve(__dirname, '../src/manifest.json'),
        to: './manifest.json',
        ignore: ['.*'],
      },
    ]),
    // 消除冗余的css代码
    new purifyCssWebpack({
      paths: glob.sync(path.join(__dirname, '../src/pages/*/*.html')),
    }),
    new webpack.DefinePlugin({
      'process.env': {
        GBL_ENV: JSON.stringify(env),
      },
      IS_ENV: JSON.stringify(env),
      APIUrl: JSON.stringify(apiUrl),
      BASEUrl: JSON.stringify(baseUrl),
    }),
  ],
}

//修改   自动化配置页面
var htmlArray = []
Object.keys(entrys).forEach(function(element) {
  htmlArray.push({
    _html: element,
    title: '',
    chunks: [element],
  })
})

//自动生成html模板
htmlArray.forEach(element => {
  module.exports.plugins.push(new htmlWebpackPlugin(getHtmlConfig(element._html, element.chunks)))
})

// 获取html-webpack-plugin参数的方法
function getHtmlConfig(name, chunks) {
  return {
    template: `./src/pages/${name}/index.html`,
    filename: `${name}.html`,
    inject: true,
    hash: true, //开启hash  ?[hash]
    chunks: chunks,
    minify:
      process.env.NODE_ENV === 'development'
        ? false
        : {
            removeComments: true, //移除HTML中的注释
            collapseWhitespace: true, //折叠空白区域 也就是压缩代码
            removeAttributeQuotes: true, //去除属性引用
          },
  }
}

//动态添加入口
function getEntry(PAGES_DIR) {
  var entry = {}
  //读取src目录所有page入口
  glob.sync(PAGES_DIR + '**/index.jsx').forEach(function(name) {
    var start = name.indexOf('pages/') + 4
    var end = name.length - 4
    var eArr = []
    var n = name.slice(start, end)
    n = n.split('/')[1]
    eArr.push(name)
    entry[n] = eArr
  })
  return entry
}
