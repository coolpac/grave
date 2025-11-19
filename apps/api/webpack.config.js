const path = require('path');

module.exports = function (options, webpack) {
  return {
    ...options,
    resolve: {
      ...options.resolve,
      modules: [
        path.resolve(__dirname, '../../node_modules'),
        path.resolve(__dirname, 'node_modules'),
        'node_modules',
      ],
      symlinks: false, // Disable symlink resolution for pnpm
    },
  };
};

