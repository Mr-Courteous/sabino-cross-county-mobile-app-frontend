module.exports = function(api) {
  api.cache(true);
  
  // We apply transform-remove-console globally so that ZERO console.logs 
  // or console.error statements leak into the production bundle
  const plugins = [
    ['transform-remove-console', { exclude: [] }]  // Excludes nothing, removes everything
  ];

  return {
    presets: ['babel-preset-expo'],
    plugins: plugins
  };
};
