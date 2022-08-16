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
        filename: 'lib/[name]-[contenthash:8].js',
        chunkFilename: (pathData) => {
            let name = pathData.chunk.id.replace(/(src_|_js)/g, '');
            if (name === 'vendors-node_modules_croquet_worldcore-kernel_Mixins') name = "croquet";
            if (name === 'vendors-node_modules_dimforge_rapier3d_rapier') name = "rapier3d";
            if (name.includes('node_modules')) name = "misc";
            return `lib/${name}-[contenthash:8].js`;
        },
        webassemblyModuleFilename: "lib/[modulehash].wasm",
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
        watchFiles: ['./src/**.js', './*.js'],
        port: 9684,
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
                { from: 'assets/SVG/*'},
                { from: 'assets/avatars/*'},
                { from: 'assets/css/*'},
                { from: 'assets/fonts/**/*'},
                { from: 'assets/images/*'},
                { from: 'assets/sky/*'},
                { from: 'worlds/*.{js,vrse}'},
                { from: 'meta/version.txt', to: 'meta/version.txt'},
                { from: 'behaviors/**/*'}
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
                        console.log(Object.keys(file));
                        if (!Object.keys(file)[0].startsWith("lib/")) {
                            return {code: file[Object.keys(file)[0]]};
                        }
                        // https://github.com/mishoo/UglifyJS2#minify-options
                        const uglifyJsOptions = {
                            /* your `uglify-js` package options */
                            keep_fnames: true
                        };
                        console.log("minify", Object.keys(file));
                        return require("uglify-js").minify(file, uglifyJsOptions)
                    },
                })
            ]
        };
    } else {
        config.module.rules.push({
            test: /\.js$/,
            enforce: "pre",
            use: ["source-map-loader"],
        });
        config.plugins.push(
            new CopyPlugin({
                patterns: [
                    { from: 'apiKey.js', to: 'apiKey.js', noErrorOnMissing: true },
                ]
            })
        );
    }
    return config;
};

/* globals require __dirname module */
