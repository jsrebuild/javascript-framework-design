
module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['qunit'],

    // list of files / patterns to load in the browser
    files: [
      'test/vendor/jquery.js',
      'test/vendor/underscore.js',
      'dist/mBackbone.js',
      'test/modules/*.js'
    ],
    
    reporters: ['progress'],
    port: 9877,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['PhantomJS'],
    singleRun: true,
    customLaunchers: {
        Chrome_sandbox: {
            base: 'Chrome',
            flags: ['--no-sandbox']
        }
    }
  })
}
