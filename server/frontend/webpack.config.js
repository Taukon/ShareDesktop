const path = require('path');

module.exports = {
  //mode: 'development',
  mode: "production",

  target: 'web',

  entry: {
    app: path.join(__dirname, 'app','app.ts'),
    app_no_audio: path.join(__dirname, 'app_no_audio','app_no_audio.ts'),
  },

  output: {
    path: path.resolve("..", "public"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
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
    extensions:['.ts', '.js']
  },
//   optimization: {
//     minimize: false, // enabling this reduces file size and readability
//   },
};