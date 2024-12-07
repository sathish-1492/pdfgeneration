const templateConfig = {

    libraryFile: '/js/lib/library.js', //Will DO laters
    pages: {
        pdfgenerator: {
            sourceFiles: [
                '/template/pdf.template',
                '/template/pdf_editor.template',
                '/template/common.template'
            ],
            outputFile: '/template/pdf.templates.min.js',
            libraryOutputFile: '/static/js/library.pdf.min.js'
        }
    }
}

const combineCSS = {
    pdf: {
        sourceFiles: [
            "/css/topbar.css",
            "/css/pdf/pdfgenerator.css",
            "/css/pdf/pdfpreview.css",
            "/css/dialog.css"
        ],
        outputFile: '/static/css/pdf.min.css'
    },
}

const combineJS = {
    pdggenerator: {
        sourceFiles: [
            "/js/utils/storage.js",
            "/js/engine/template.js",
            "/js/pdf/pdfgenerator.js",
            "/js/component/dialog.js",
        ],
        outputFile: '/static/js/pdf.min.js'
    },
}

module.exports = { templateConfig, combineCSS, combineJS}
