({
    baseUrl: 'lib',
    out: './dist/reanimator-jquery.1.8.3.js',
    name: '../node_modules/almond/almond',

    include: ['reanimator-jquery.1.8.3'],
    wrap: {
        start: '(function (global) {',
        end: 'require("reanimator-jquery.1.8.3");\n}(this))'
    },

    optimize: 'none',

    cjsTranslate: true
})

