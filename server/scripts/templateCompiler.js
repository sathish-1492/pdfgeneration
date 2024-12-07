const fs = require('fs');
const cheerio = require('cheerio');
const path = require('path');
const TemplateParser = require('./templateParser');
const { templateConfig, combineCSS, combineJS } = require('./template.config');

const base_dir = '../../client';
const templatesDir = path.join(__dirname, base_dir);

// Function to read and combine content from the given list of files
function readAndCombinePageTemplates(page) {

    //console.trace('Template source Files ', page.sourceFiles);

    let combinedContent = '';

    page.sourceFiles.forEach(file => {
        const filePath = path.join(templatesDir, file);
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            combinedContent += fileContent + '\n';  // Add newline for separation between templates
        } catch (err) {
            console.error(`Error reading file "${file}":`, err);
        }
    });


    var templateIdWithparsed = {};
    const $ = cheerio.load(combinedContent);

    // Find all <script type="text/template"> tags
    $('script[type="text/template"]').each((i, element) => {
        const templateId = $(element).attr('id');
        const isInternal = $(element).attr('internal') || false;
        const isMacros = $(element).attr('is_macros') || false;
        const macroName = $(element).attr('macros');

        const templateContent = $(element).html().trim();

        try {
            templateIdWithparsed[templateId] = {
                internal: isInternal,
                is_macros: isMacros,
                macro_name: macroName,
                htmlcontent: templateContent
            };

        } catch (err) {
            console.error(`Error compiling template "${templateId}":`, err);
        }
    });

    // console.log('templateIdWithparsed', templateIdWithparsed);

    const parser = new TemplateParser(templateIdWithparsed);
    const parsedContent = parser.parser();

    const buiderScript = `const templateCache = ${JSON.stringify(parsedContent, null, 4)}`;

    try {
        fs.writeFileSync(path.join(templatesDir, page.outputFile), buiderScript, 'utf8');
        console.log(`Successfully wrote to template script file "${page.outputFile}"`);
    } catch (err) {
        console.error(`Error writing file "${page.outputFile}":`, err);
    }

    const libSource = [
        templateConfig.libraryFile,
        page.outputFile
    ]

    combineFiles(libSource, page.libraryOutputFile);
}


// Function to read, combine, and write files
async function combineFiles(filePaths, outputPath) {
    try {

        // console.info("")
        // console.info("Compine source files", filePaths)
        // Read all files concurrently
        const fileContents = await Promise.all(
            filePaths.map(filePath => fs.readFileSync(path.join(__dirname, base_dir, filePath), 'utf8'))
        );

        // Combine file contents into one string
        const combinedData = fileContents.join('\n'); // Add a newline between each file's content

        // Write the combined data to the output file
        await fs.writeFileSync(path.join(__dirname, base_dir, outputPath), combinedData);
        console.info("Files have been successfully combined and written to", outputPath);
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

//compine template files and parse to each page  
for (let [key, value] of Object.entries(templateConfig.pages)) {
    readAndCombinePageTemplates(value);
}

// compine and then minifed js and css files
for (let [key, value] of Object.entries(combineCSS)) {
    combineFiles(value.sourceFiles, value.outputFile);
}

for (let [key, value] of Object.entries(combineJS)) {
    combineFiles(value.sourceFiles, value.outputFile);

}

exports.compileTemplate = readAndCombinePageTemplates

