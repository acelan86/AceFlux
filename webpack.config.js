var path = require("path");
module.exports = {
    entry: './src/Flux',
    output: {
        path: path.join(__dirname, "dist"),
        filename: "Flux.js",
        libraryTarget: "umd"
    }
}