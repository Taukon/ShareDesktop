const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  //mode: 'development',
  mode: "production",

  target: 'node',
  externals: [nodeExternals()], 

  // エントリポイントとなるコード
  entry: {
    app: path.join(__dirname, 'app','app.ts'),
    app_no_audio: path.join(__dirname, 'app_no_audio','app_no_audio.ts'),
  },

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
            {
              loader: "ts-loader", 
            //   options: {
            //     transpileOnly: true,
            //   },
            },
          ],
      }
    ]
  },
//   externals: {
//     bufferutil: "bufferutil",
//     "utf-8-validate": "utf-8-validate",
//   },
  resolve: {
    extensions:['.ts', '.js'],
  },
//   optimization: {
//     minimize: false, // enabling this reduces file size and readability
//   },
};