const path = require('path');

// Shared nest-cli webpack config for services that build with webpack.
// `serviceDir` must be each service's own `__dirname` so `entry` and the
// bundled output resolve relative to that service, not this shared package.
function createNestWebpackConfig(serviceDir) {
  return (options) => ({
    ...options,
    entry: path.resolve(serviceDir, 'src/main.ts'),
    // @scalar/nestjs-api-reference pulls in ESM-only deps with no CJS entry point,
    // so they must be bundled instead of left external like the rest of node_modules.
    externals: [
      (ctx, callback) => {
        if (/^@scalar\//.test(ctx.request || '')) {
          return callback();
        }
        return options.externals[0](ctx, callback);
      },
    ],
    output: {
      ...options.output,
      filename: 'main.cjs',
    },
    resolve: {
      ...options.resolve,
      extensionAlias: {
        '.js': ['.ts', '.js'],
      },
    },
  });
}

module.exports = { createNestWebpackConfig };
