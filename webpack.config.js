module.exports = {
    context: __dirname + '/js',

    output: {
        path: __dirname + '/dist',
        filename: '[name].js',
    },

    cache: true,

    entry: {
        background: './background.js',
        popup: './popup.js',
        summate: './summate.js',
        options: './options.js',
    },

    module: {
        loaders: [
            {test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'},
            {test: /\.css$/, loader: 'style-loader!css-loader'},
            {test: /\.gif$/,
                loader: 'url-loader?limit=10000&minetype=image/gif'},
            {test: /\.jpg$/,
                loader: 'url-loader?limit=10000&minetype=image/jpg'},
            {test: /\.png$/,
                loader: 'url-loader?limit=10000&minetype=image/png'},
            {test: /\.svg$/,
                loader: 'url?prefix=img/&limit=5000&mimetype=image/svg+xml'},
        ],
    },
};
