const webpack = require('webpack');
const path = require('path');
const package = require('./package.json');

// variables
const isProduction = process.argv.indexOf('-p') >= 0 || process.env.NODE_ENV === 'production';
const sourcePath = path.join(__dirname, './src');
const outPath = path.join(__dirname, './build');

// plugins
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackCleanupPlugin = require('webpack-cleanup-plugin');
const CopyWebpackPlugin = require("copy-webpack-plugin")

module.exports = (env, argv) => { 
  let publicPath = "http://localhost:4000/"

  if (env == "prod") {
    publicPath = "https://static.maesure.com/dashboard/"
  } else if (env == "staging") {
    publicPath = "https://static.maesure.com/dashboard-staging/"
  }
  
  return {
    context: sourcePath,
    entry: {
      app: './main.tsx'
    },
    output: {
      path: outPath,
      publicPath: publicPath,
      filename: isProduction ? '[contenthash].js' : '[hash].js',
      chunkFilename: isProduction ? '[name].[contenthash].js' : '[name].[hash].js'
    },
    target: 'web',
    resolve: {
      extensions: ['.js', '.ts', '.tsx'],
      // Fix webpack's default behavior to not load packages with jsnext:main module
      // (jsnext:main directs not usually distributable es6 format, but es6 sources)
      mainFields: ['module', 'browser', 'main'],
      alias: {
        app: path.resolve(__dirname, 'src/app/'),
        shared: path.resolve(__dirname, '../shared/')
      }
    },
    module: {
      rules: [
        // .ts, .tsx
        {
          test: /\.tsx?$/,
          use: [
            !isProduction && {
              loader: 'babel-loader',
              options: { plugins: ['react-hot-loader/babel'] }
            },
            'ts-loader'
          ].filter(Boolean)
        },
        // css
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            {
              loader: 'css-loader',
              query: {
                modules: 'global',
                sourceMap: !isProduction,
                importLoaders: 1,
                localIdentName: isProduction ? '[hash:base64:5]' : '[local]__[hash:base64:5]'
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                ident: 'postcss',
                plugins: [
                  require('postcss-import')({ addDependencyTo: webpack }),
                  require('postcss-url')(),
                  require('postcss-preset-env')({
                    /* use stage 2 features (defaults) */
                    stage: 2
                  }),
                  require('postcss-reporter')(),
                  require('postcss-browser-reporter')({
                    disabled: isProduction
                  })
                ]
              }
            }
          ]
        },
        {
          test: /\.styl$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            {
              loader: 'css-loader',
              query: {
                modules: 'global',
                sourceMap: !isProduction,
                importLoaders: 1,
                localIdentName: isProduction ? '[hash:base64:5]' : '[local]__[hash:base64:5]'
              }
            },
            {
              loader: "stylus-loader", // compiles Stylus to CSS
              query: {
                sourceMap: !isProduction,
                modulesDirectories: ['node_modules'],
                "resolve url": true
              }
            }
          ]
        },
        // static assets
        { test: /\.html$/, use: 'html-loader' },
        { test: /\.(a?png|svg)$/, use: 'url-loader?limit=10000' },
        {
          test: /\.(jpe?g|gif|bmp|mp3|mp4|ogg|wav|eot|ttf|woff|woff2)$/,
          use: 'file-loader'
        }
      ]
    },
    optimization: {
      splitChunks: {
        name: true,
        cacheGroups: {
          commons: {
            chunks: 'initial',
            minChunks: 2
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            chunks: 'all',
            filename: isProduction ? 'vendor.[contenthash].js' : 'vendor.[hash].js',
            priority: -10
          }
        }
      },
      runtimeChunk: true
    },
    plugins: [
      new webpack.EnvironmentPlugin({
        NODE_ENV: 'development', // use 'development' unless process.env.NODE_ENV is defined
        DEBUG: false
      }),
      //new WebpackCleanupPlugin(),
      new MiniCssExtractPlugin({
        filename: '[hash].css',
        disable: !isProduction
      }),
      new HtmlWebpackPlugin({
        template: 'assets/index.html',
        minify: {
          minifyJS: true,
          minifyCSS: true,
          removeComments: true,
          useShortDoctype: true,
          collapseWhitespace: true,
          collapseInlineTagWhitespace: true
        },
        append: {
          head: [
            `<script src="//cdn.polyfill.io/v3/polyfill.min.js"></script>`,
            ]
        },
        favicon: 'assets/icon-1024.png',
        inject: true,
      }),
      new CopyWebpackPlugin([
        {from: 'service-worker.js', to: '.'},
        {from: 'images/**', to: '.', flatten: true}
      ]),
    ],
    devServer: {
      contentBase: sourcePath,
      hot: true,
      inline: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
      },
      historyApiFallback: {
        disableDotRule: true
      },
      open: false,
      stats: 'minimal',
      clientLogLevel: 'warning'
    },
    // https://webpack.js.org/configuration/devtool/
    devtool: isProduction ? 'hidden-source-map' : 'cheap-module-eval-source-map',
    node: {
      // workaround for webpack-dev-server issue
      // https://github.com/webpack/webpack-dev-server/issues/60#issuecomment-103411179
      fs: 'empty',
      net: 'empty'
    }
  }
};
