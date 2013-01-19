({
    baseUrl: 'lib',
    out: './dist/reanimator.js',
    name: '../node_modules/almond/almond',

    include: ['reanimator'],
    wrap: {
        start: '(function (global) {',
        end: 'require("reanimator");\n}(this))'
    },

    //Comment this line out to get
    //minified content.
    optimize: 'none',

    //Uncomment this line if you want the
    //built file to use eval with sourceURL
    //for each module built into the built file.
    //This can help make debugging of the built file
    //a little more pleasant in the debugger.
    //Note however that it only seems to work well
    //in Chrome at the moment. Firefox may be confused
    //by the double eval going on.
    //Also, only use it when not doing minification,
    //just for debugging only. It also may cause
    //problems if you are using IE conditional comments
    //in JavaScript
    //useSourceUrl: true,

    //Instruct the r.js optimizer to
    //convert commonjs-looking code
    //to AMD style, which is needed for
    //the optimizer to properly trace
    //dependencies.
    cjsTranslate: true
})
