const webpack = require('webpack');

module.exports = function override(config, env) {
  // Add webpack plugins to handle localStorage during build
  config.plugins.push(
    new webpack.DefinePlugin({
      'typeof window': JSON.stringify('undefined'),
      'typeof localStorage': JSON.stringify('undefined')
    })
  );

  // Add fallback for localStorage in Node.js environment
  config.resolve.fallback = {
    ...config.resolve.fallback,
    localStorage: false,
    sessionStorage: false
  };

  // Ignore localStorage-related modules during build
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    /localStorage/,
    /sessionStorage/
  ];

  return config;
};