const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");
const path = require('path');
const webpack = require("webpack");

const config = {
    entry: {
        'index': './index.js',
        'test': './test.js',
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name]-[contenthash:8].js',
        chunkFilename: 'chunk-[name]-[contenthash:8].js',
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
    devServer: {
        allowedHosts: 'all',
        watchFiles: ['./src/**.js', './index.js', './test.js', './root.js'],
        port: 9009,
    },
    module: {
        rules: [
            {
                test: /\.(jpe?g|png|gif|svg|zip|glb)$/i,
                type: 'asset/resource',
            },
            {
                test: /\.js$/,
                enforce: "pre",
                use: ["source-map-loader"],
            },
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html',   // input
            filename: 'index.html',   // output filename in dist/
            chunks: ['index']
        }),
        new HtmlWebpackPlugin({
            inject: true,
            template: 'test.html',   // input
            filename: 'test.html',   // output filename in dist/
            chunks: ['test']
        }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer']
        }),
        new CopyPlugin({
            patterns: [
                { from: 'assets', to: 'assets' },
            ]
        }),
    ],
};

function selectiveMinifier(input, sourceMap, minimizerOptions, extractComments) {
    // The `minimizerOptions` option contains option from the `terserOptions` option
    // You can use `minimizerOptions.myCustomOption`

    // Custom logic for extract comments
    const { map, code } = require("uglify-module") // Or require('./path/to/uglify-module')
          .minify(input, {
              /* Your options for minification */
          });

    return { map, code, warnings: [], errors: [], extractedComments: [] };
};


module.exports = (env, argv) => {
    if (argv.mode === 'production') {
        console.log("argv.mode", argv.mode);
        config.optimization = {
            minimize: true,
            //            minify: selectiveMinifier,
            minimizer: [
                new TerserPlugin({
                    minify: (file) => {
                        if (Object.keys(file)[0].startsWith("expanders/")) {
                            return {code: file[Object.keys(file)[0]]};
                        }
                        // https://github.com/mishoo/UglifyJS2#minify-options
                        const uglifyJsOptions = {
                            /* your `uglify-js` package options */
                        };

                        return require("uglify-js").minify(file, uglifyJsOptions)
                    },
                    terserOptions: {
                        keep_classnames: true,
                        keep_fnames: true
                    }
                })
            ]
        };
    }
    return config;
}
