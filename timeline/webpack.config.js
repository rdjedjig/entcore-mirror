var webpack = require('webpack');
var path = require('path');

module.exports = {
    entry: {
        'timeline/application': './timeline/src/main/resources/public/ts/timeline/app.ts',
        'externalNotifs/application': './timeline/src/main/resources/public/ts/externalNotifs/app.ts',
        'history/application': './timeline/src/main/resources/public/ts/history/app.ts',
        'timeline2/application': './timeline/src/main/resources/public/ts/timeline2/app.ts',
        behaviours: './timeline/src/main/resources/public/ts/behaviours.ts'
    },
    output: {
        filename: '[name].js',
        path: __dirname + 'dest'
    },
    externals: {
        "entcore/entcore": "entcore",
        "entcore": "entcore",
        "entcore/libs/moment/moment": "entcore",
        "entcore/libs/underscore/underscore": "_",
        "entcore/libs/jquery/jquery": "entcore",
        "angular": "window.angular",
        "ode-ts-client": 'window.entcore["ode-ts-client"]',
        "ode-ngjs-front": 'window.entcore["ode-ngjs-front"]'
    },
    resolve: {
        modulesDirectories: ['bower_components', 'node_modules'],
        root: path.resolve(__dirname),
        extensions: ['', '.ts', '.js']
    },
    devtool: "source-map",
    module: {
        loaders: [
            {
                test: /\.ts$/,
                loader: 'ts-loader'
            }
        ]
    }
}