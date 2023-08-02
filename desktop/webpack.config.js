const path = require('path');

const isDev = process.env.NODE_ENV === 'development';


module.exports = {
  mode: isDev ? 'development' : 'production',
  
  target: 'node',
  entry: {
    desktop_client: './src/desktop_client.ts',
  },

  node: {
    __dirname: false,
    __filename: false,
  },
  resolve: {
    extensions: ['.js', '.ts'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: './',
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.ts/,
        //exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.node$/,
        loader: 'node-loader',
      },
    ],
  },

};
