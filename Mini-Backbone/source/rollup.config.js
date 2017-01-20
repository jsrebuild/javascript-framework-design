export default {
  entry: './src/index.js',
  format: 'iife',
  moduleName: 'mBackbone',
  dest: './dist/mBackbone.js',
  globals: {
  	underscore: '_',
  	jquery: '$'
  }
}