const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  //mode: 'development',
  mode: "production",

  target: 'node',
  externals: [nodeExternals()], 

  entry: {
    app: path.join(__dirname, 'src','app','app.ts'),
    appNoAudio: path.join(__dirname, 'src','appNoAudio','appNoAudio.ts'),
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