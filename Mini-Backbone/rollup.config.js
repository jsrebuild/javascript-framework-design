export default {
  entry: './src/index.js',
  format: 'iife',
  moduleName: 'mBackbone',
  dest: './lib/mBackbone.js',
  globals: {
  	underscore: '_',
  	jquery: '$'
  }
}
