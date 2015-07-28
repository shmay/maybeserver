'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish'),
        extract: 'auto'
      },
      all: [
        'index.js',
        'cronjobs/*.js'
      ]
    }
  });
}
