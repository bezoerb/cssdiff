// Generated on 2014-07-30 using generator-nodejs 2.0.1
module.exports = function(grunt) {
    'use strict';
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            all: [
                'Gruntfile.js',
                'index.js',
                'test/**/*.js'
            ],
            options: {
                jshintrc: true
            }
        },
        simplemocha: {
            all: ['test/**/*.js'],
            options: {
                reporter: 'spec',
                ui: 'bdd',
                timeout: 100000
            }
        },
        watch: {
            js: {
                files: ['**/*.js', '!node_modules/**/*.js'],
                tasks: ['default'],
                options: {
                    nospawn: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-complexity');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.registerTask('test', ['jshint', 'simplemocha', 'watch']);
    grunt.registerTask('ci', ['jshint', 'simplemocha']);
    grunt.registerTask('default', ['test']);
};
