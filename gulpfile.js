var gulp = require("gulp");
var amdOptimize = require("amd-optimize");
var connect = require("gulp-connect");
var concat = require("gulp-concat");

gulp.task('default', function() {
    gulp.src('src/**.js')
        .pipe(amdOptimize(""))
        .pipe(concat("Flux.js"))
        .pipe(gulp.dest('dist'))
});

gulp.task("connect", function () {
    var connect = require("gulp-connect");
    
    connect.server({
        port: 3333
    });
});

gulp.task('utils', function() {
    gulp.src('src/utils.js')
        .pipe(browserify({
            //insertGlobals : true,
            debug : true
        }))
        .pipe(gulp.dest('dist'))
});
