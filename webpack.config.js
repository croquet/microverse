import HtmlWebPackPlugin from'html-webpack-plugin';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    entry : './src/index.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name]-[contenthash:8].js',
        chunkFilename: 'chunk-[name]-[contenthash:8].js',
    },
    devServer: {
        disableHostCheck: true,
        contentBase: path.join(__dirname, 'dist'),
        publicPath: '/',
        port: 9009
    },
    module: {
        rules: [
            {
                test: /\.(jpe?g|png|gif|svg|zip|glb)$/i, 
                loader: "url-loader?name=app/images/[name].[ext]"

               //test: /\.(png|svg|jpg|gif|mp3)$/,
                //loader: 'file-loader',
                //options: {
                //    name: '[contenthash:8].[ext]',
                //},
            },
        ],
    },
    // use Croquet loaded via <script>
    externals: {
        "@croquet/croquet": "Croquet",
    },
    plugins: [
        new HtmlWebPackPlugin({
            template: 'src/index.html',   // input
            filename: 'index.html',   // output filename in dist/
        }),
    ],
};
