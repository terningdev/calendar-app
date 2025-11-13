const webpack = require('webpack');

module.exports = function override(config, env) {
  // Add webpack DefinePlugin to replace localStorage at compile time
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env.DISABLE_LOCALSTORAGE': JSON.stringify('true')
    })
  );

  // Modify HtmlWebpackPlugin template options to avoid localStorage access
  const htmlWebpackPlugin = config.plugins.find(
    plugin => plugin.constructor.name === 'HtmlWebpackPlugin'
  );
  
  if (htmlWebpackPlugin) {
    htmlWebpackPlugin.options = {
      ...htmlWebpackPlugin.options,
      templateParameters: {
        ...htmlWebpackPlugin.options.templateParameters,
        localStorage: undefined,
        sessionStorage: undefined
      }
    };
  }

  return config;
};