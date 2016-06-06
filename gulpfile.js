var gulp = require('gulp');
var gutil = require('gulp-util');
var plumber = require('gulp-plumber');

var sourcemaps = require('gulp-sourcemaps');
var less = require('gulp-less');
var autoprefixer = require('gulp-autoprefixer');

var _ = require('lodash');
var through = require('through2');

var webpack = require('webpack');
var webpackStream = require('webpack-stream');

const filter = require('gulp-filter');
var livereload = require('gulp-livereload');

gulp.task('default', ['watch']);

gulp.task('compile', ['compile:scripts', 'compile:styles', 'html', 'assets']);

gulp.task('compile:scripts', function () {
	return gulp.src('ts/run.tsx')
		.pipe(webpackStream(require('./webpack.config.js')))
		.pipe(gulp.dest('dist/'));
});

gulp.task('compile:web', ['compile:scripts:web', 'compile:styles', 'html', 'assets']);

gulp.task('compile:scripts:web', function () {
	var config = require('./webpack.config.js');
	config.target = 'web';
	config.plugins = config.plugins.concat([
		new webpack.optimize.UglifyJsPlugin({
			comments: false,
			compress: {
				warnings: false
			}
		}),
		new webpack.optimize.DedupePlugin()
	]);
	config.devtool = '#source-map';
	return gulp.src('ts/run.tsx')
		.pipe(webpackStream(config))
		.pipe(gulp.dest('dist/'));
});

gulp.task('compile:styles', function () {
	return gulp.src('less/joust.less')
		.pipe(plumber(function(err) {
			gutil.log(gutil.colors.red(err));
			this.emit("end", new gutil.PluginError(err));
		}))
		.pipe(sourcemaps.init())
		.pipe(less({'strictMath': true}))
		.pipe(autoprefixer({browsers: ['last 2 versions']}))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('dist/'))
		.pipe(filter(['**/*.css']))
		.pipe(livereload());
});

gulp.task('html', function () {
	return gulp.src('html/**/*.html')
		.pipe(gulp.dest('dist/'));
});

gulp.task('assets', function () {
	return gulp.src('assets/**/*.*')
		.pipe(gulp.dest('dist/assets/'));
});

gulp.task('watch', ['watch:styles', 'watch:html', 'watch:assets'], function () {
	livereload.listen();
	gutil.log(gutil.colors.yellow("Warning: not compiling or watching TypeScript files"));
	gutil.log(gutil.colors.yellow("Use 'webpack --watch -d' for development"));
});

gulp.task('watch:scripts', function () {
	gutil.log(gutil.colors.red("Deprecated: use 'webpack -d --watch' instead"));
});

gulp.task('watch:styles', ['compile:styles'], function () {
	return gulp.watch(['less/**/*.less'], ['compile:styles']);
});

gulp.task('watch:html', ['html'], function () {
	return gulp.watch(['html/**/*.html'], ['html']);
});

gulp.task('watch:assets', ['assets'], function () {
	return gulp.watch(['assets/**/*.*'], ['assets']);
});

gulp.task('enums', function () {
	return gulp.src(process.env.ENUMS_JSON || 'enums.json')
		.pipe(through.obj(function (file, encoding, callback) {
			gutil.log('Reading enums from', gutil.colors.magenta(file.path));
			var json = String(file.contents);
			var out = '// this file was automatically generated by `gulp enums`\n';
			out += '// enums.json can be obtained from https://api.hearthstonejson.com/v1/enums.json\n';
			var enums = JSON.parse(json);
			_.each(enums, function (keys, name) {
				out += '\nexport const enum ' + name + ' {\n';
				foo = [];
				_.each(keys, function (value, key) {
					foo.push('\t' + key + ' = ' + value);
				});
				out += foo.join(',\n') + '\n';
				out += '}\n';
				gutil.log('Found enum', "'" + gutil.colors.cyan(name) + "'", 'with', gutil.colors.magenta(foo.length, 'members'));
			});
			file.path = 'enums.d.ts';
			file.contents = new Buffer(out);
			gutil.log('Writing to', gutil.colors.magenta(file.path));
			callback(null, file);
		}))
		.pipe(gulp.dest('ts/'));
});
