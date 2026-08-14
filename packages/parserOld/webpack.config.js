const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => ({
    mode: argv.mode === 'production' ? 'production' : 'development',

    // Webpack 4 hardcodes MD4 in its source-map plugin, which modern
    // Node/OpenSSL versions no longer support.
    devtool: false,

    entry: {
        ui: './src/app/index.tsx',
        main: './src/plugin/main.ts',
    },

    module: {
        rules: [{ test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ }],
    },

    resolve: { extensions: ['.tsx', '.ts', '.jsx', '.js'] },

    // Webpack 4 uses MD4 for scope-hoisted modules, which is disabled in
    // modern Node/OpenSSL versions.
    optimization: {
        concatenateModules: false,
        minimizer: [
            new TerserPlugin({
                cache: false,
            }),
        ],
    },

    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        hashFunction: 'sha256',
    },

    plugins: [
        new HtmlWebpackPlugin({
            template: './src/app/index.html',
            filename: 'ui.html',
            inlineSource: '.(js)$',
            chunks: ['ui'],
        }),
        new HtmlWebpackInlineSourcePlugin(),
    ],
});
