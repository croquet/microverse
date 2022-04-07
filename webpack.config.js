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
        watchFiles: ['./src/**.js', './index.js', './test.js', 'default.js', './root.js'],
        port: 9009,
    },
    module: {
        noParse: /\.wasm$/,
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
            {
                test: /\.wasm$/,
                type: 'asset/resource',
                generator: {
                    outputPath: "wasm/"
                }
            },
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html',   // input
            filename: 'index.html',   // output filename in dist/
            minify: false,
            chunks: ['index']
        }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer']
        }),
        new CopyPlugin({
            patterns: [
                { from: 'assets/3D/*'},
                { from: 'assets/SVG/{full-circle,BitcoinSign,CroquetSymbol_CMYK_NoShadow}.svg'},
                { from: 'assets/avatars/**/*'},
                { from: 'assets/css/**/*'},
                { from: 'assets/fonts/**/*'},
                { from: 'assets/images/{Colony,ball,earthbase}.png'},
                { from: 'assets/images/earthshadow.jpg', to: 'assets/images/earthshadow.jpg'},
                { from: 'assets/sky/**/*'},
                { from: 'assets/videos/fromPCtoHMD.mp4', to: 'assets/videos/fromPCtoHMD.mp4'},
            ]
        }),
        new CopyPlugin({
            patterns: [
                { from: 'behaviors/**/*',
                  globOptions: {ignore: ["**/croquet/*.js"]}
                },
                { from: 'default.js', to: 'default.js' },
                { from: 'test.js', to: 'test.js' },
                { from: 'apiKey.js', to: 'apiKey.js' },
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
                        if (!Object.keys(file)[0].startsWith("index-")) {
                            return {code: file[Object.keys(file)[0]]};
                        }
                        // https://github.com/mishoo/UglifyJS2#minify-options
                        const uglifyJsOptions = {
                            /* your `uglify-js` package options */
                            keep_fnames: true
                        };

                        console.log("minify");

                        return require("uglify-js").minify(file, uglifyJsOptions)
                    },
                })
            ]
        };
    }

    config.plugins.push(new webpack.DefinePlugin({
        ASSET_DIRECTORY: JSON.stringify(argv.mode === "production" ? "." : "..")
    }));

    return config;
}

/* globals require __dirname module */
