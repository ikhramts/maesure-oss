const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

let mainConfig = {
    mode: 'development',
    entry: './src/main/main.ts',
    target: 'electron-main',
    output: {
        filename: 'main.bundle.js',
        path: __dirname + '/build',
    },
    node: {
        __dirname: false,
        __filename: false,
    },
    resolve: {
        extensions: ['.js', '.json', '.ts'],
        alias: {
            client: path.resolve(__dirname, 'src/'),
            shared: path.resolve(__dirname, '../shared/')
        }

    },
    module: {
        rules: [
            {
                // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
                test: /\.(ts)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'ts-loader',
                },
            },
            { test: /\.node$/, loader: 'native-ext-loader' },
            {
                test: /\.(jpg|png|svg|ico|icns)$/,
                loader: 'file-loader',
                options: {
                    name: '[path][name].[ext]',
                },
            },
            {
                test: /\.(eot|ttf|woff|woff2)$/,
                loader: 'file-loader',
                options: {
                    name: '[path][name].[ext]',
                },
            },
        ],
    },
};

let rendererConfig = {
    mode: 'development',
    entry: './src/renderer/renderer.tsx',
    target: 'electron-renderer',
    output: {
        filename: 'renderer.bundle.js',
        path: __dirname + '/build',
    },
    node: {
        __dirname: false,
        __filename: false,
    },
    resolve: {
        extensions: ['.js', '.json', '.ts', '.tsx'],
        alias: {
            client: path.resolve(__dirname, 'src/'),
            shared: path.resolve(__dirname, '../shared/')
        }
    },
    module: {
        rules: [
            {
                // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
                test: /\.(ts|tsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'ts-loader',
                },
            },
            {
                test: /\.(css)$/,
                use: [
                    'style-loader',
                    'css-loader?sourceMap',
                ],
            },
            {
                test: /\.(styl)$/,
                use: [
                    'style-loader',
                    'css-loader?sourceMap',
                    'stylus-loader?sourceMap&resolve url',
                ],
            },
            {
                test: /\.(jpg|png|svg|ico|icns)$/,
                loader: 'file-loader',
                options: {
                    name: '[path][name].[ext]',
                },
            },
            {
                test: /\.(eot|ttf|woff|woff2)$/,
                loader: 'file-loader',
                options: {
                    name: '[path][name].[ext]',
                },
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, './src/renderer/index.html'),
        }),
    ],
};

module.exports = [mainConfig, rendererConfig];
