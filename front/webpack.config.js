const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    app: path.resolve(__dirname, 'src/'),
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    allowedHosts: 'all',
    compress: true,
    port: 9000,
  },
  output: {
    filename: '[name].js',
    path: __dirname + '/dist',
  },
  plugins: [
    new webpack.WatchIgnorePlugin({
      paths: [
        /\.d\.ts$/,
      ],
    }),
    new HtmlWebpackPlugin({
      template: 'src/index.html',
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new webpack.DefinePlugin({
      'process.env.API_URL': JSON.stringify(process.env.API_URL),
    }),
  ],
  module: { rules: [
    {
      test: /\.js$/,
      include: path.resolve(__dirname, 'src'),
      use: [
        'babel-loader',
      ],
    }, {
      test: /\.css$/i,
      use: [
        'style-loader', 'css-loader',
      ],
    },
    {
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false
      },
    },
    {
      test: /\.tsx?$/, loader: "ts-loader", options: { transpileOnly: false }
    }
  ] },
  optimization: {
    splitChunks: { cacheGroups: { vendor: {
      test: /[\\/]node_modules[\\/](react|react-dom|axios)[\\/]/,
      name: 'vendor',
      chunks: 'all',
    } } },
  },
  resolve: {
    fallback: {
	    'util': require.resolve('util/'),
      "assert": require.resolve("assert/"),
      "buffer": require.resolve("buffer/"),
      "url": require.resolve("url/"),
      "stream": require.resolve("stream-browserify"),
      "zlib": require.resolve("browserify-zlib"),
      "https": require.resolve("https-browserify"),
      "http": require.resolve("stream-http"),
    },
    extensions: [".ts", ".tsx", ".js"],
    modules: ['src', 'node_modules'],
    alias: {
      '@Helpers': path.resolve(__dirname, 'src/common/helpers.js'),
      '@Common': path.resolve(__dirname, 'src/common'),
      '@Style': path.resolve(__dirname, 'src/common/style.js'),
      '@Components': path.resolve(__dirname, 'src/lib'),
  } },
};
