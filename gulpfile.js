var gulp = require("gulp");
var browserify = require("browserify");
var source = require('vinyl-source-stream');

gulp.task('default', function() {
  var bundle = browserify({entries: './javascripts/shootout.js'})
    .bundle()
    .pipe(source('deps.min.js'))
    .pipe(gulp.dest('dist'));
});
