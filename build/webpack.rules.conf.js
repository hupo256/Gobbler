const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const path = require('path')
const devMode = process.env.NODE_ENV !== 'production'
const rules = [
  {
    test: /antd.*\.less$/,
    use: [
      MiniCssExtractPlugin.loader,
      {
        loader: 'css-loader',
        options: {
          importLoaders: 1,
          sourceMap: devMode,
        },
      },
      'postcss-loader',
      {
        loader: 'less-loader',
        options: {
          javascriptEnabled: true,
          modifyVars: {},
        },
      },
    ],
  },
  {
    test: /\.(js|jsx)$/,
    exclude: /node_modules/,
    include: [path.resolve(__dirname, '../src')],
    loader: 'babel-loader?cacheDirectory=true',
  },
  {
    test: /\.(ts|tsx)$/,
    exclude: /node_modules/,
    include: [path.resolve(__dirname, '../src')],
    loaders: ['babel-loader?cacheDirectory=true', 'ts-loader'],
  },
  {
    test: /\.(png|jpg|gif)$/,
    use: [
      {
        loader: 'url-loader',
        options: {
          limit: 5 * 1024, //小于这个时将会已base64位图片打包处理
          outputPath: 'images',
        },
      },
    ],
  },
  {
    test: /\.(svg|woff|woff2|eot|ttf|otf)(\?.*)?$/,
    loader: 'url-loader',
    options: {
      limit: 10000,
    },
  },
  {
    test: /\.html$/,
    use: ['html-withimg-loader'],
  },
]
module.exports = rules
