const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");
const path = require('path');
const webpack = require("webpack");

const config = {
    entry: {
        'index': './index.js'
    },
    output: {
        path: path.join(__dirname, 'npm'),
        filename: 'lib/[name]-[contenthash:8].js',
        chunkFilename: 'lib/chunk-[name]-[contenthash:8].js',
        clean: true
    },
    resolve: {
        fallback: {
            'crypto': false,
            buffer: require.resolve('buffer/'),
        }
    },
    devtool: false,
    experiments: {
        asyncWebAssembly: true
    },
    module: {
        rules: [
            {
                test: /\.(jpe?g|png|gif|svg|zip|glb)$/i,
                type: 'asset/resource',
            },
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html',   // input
            filename: 'index.html',   // output filename in npm/
            chunks: ['index']
        }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer']
        }),
        new CopyPlugin({
            patterns: [
                { from: 'assets', to: 'assets' },
            ]
        }),
        new CopyPlugin({
            patterns: [
                { from: 'behaviors', to: 'behaviors' },
                { from: 'defaultDemo.js', to: 'defaultDemo.js' },
                { from: 'test.js', to: 'test.js' },
                { from: 'server/watch-server.js', to: 'server/watch-server.js' },
                { from: 'apiKey.js', to: 'apiKey.js' },
                { from: 'staging/', to: '/' },
            ]
        }),
    ],
};

module.exports = (env, argv) => {
    if (argv.mode === 'production') {
        config.optimization = {
            minimize: true,
            minimizer: [
                new TerserPlugin({
                    minify: (file) => {
                        if (false) {
                            return {code: file[Object.keys(file)[0]]};
                        }
                        // https://github.com/mishoo/UglifyJS2#minify-options
                        const uglifyJsOptions = {
                            /* your `uglify-js` package options */
                            keep_fnames: true
                        };
                        return require("uglify-js").minify(file, uglifyJsOptions)
                    },
                })
            ]
        };
    }

    return config;
}

/* globals require __dirname module */
