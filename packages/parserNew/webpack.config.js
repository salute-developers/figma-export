const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => ({
    mode: argv.mode === 'production' ? 'production' : 'development',
    devtool: false,
    entry: {
        ui: './src/ui/index.ts',
        main: './src/plugin/main.ts',
    },
    module: {
        rules: [{ test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ }],
    },
    resolve: { extensions: ['.ts', '.js'] },
    optimization: {
        concatenateModules: false,
        minimizer: [new TerserPlugin({ cache: false })],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        hashFunction: 'sha256',
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/ui/index.html',
            filename: 'ui.html',
            inlineSource: '.(js)$',
            chunks: ['ui'],
        }),
        new HtmlWebpackInlineSourcePlugin(),
    ],
});
