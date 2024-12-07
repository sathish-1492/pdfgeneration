const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const fs = require("fs");
const path = require("path");

const config = require('./../scripts/template.config');
const templateConpile = require('./../scripts/templateCompiler');
const { error } = require('console');
const fieldsFileName = 'pdf_fields.json';

const videoDir = path.join(__dirname, '../usermedia');
if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir);
}


exports.createPdf = async (req, res) => {
    const { form, format_type } = req.body;

    try {
        const cssPath = path.join(__dirname, '../../client/css/pdf/pdfgenerator.css');
        const cssContent = fs.readFileSync(cssPath, 'utf8');

        // HTML Template
        const html = `
    <!DOCTYPE html>
    <html>
        <head>
            <style>${cssContent}</style>
        </head>
        <body>
            ${form}
        </body>
    </html>
`;


        let relativePath;
        if(format_type == 'pdf') {
            relativePath = `/usermedia/pdf_generator.pdf`;
            const pdfPath = path.join(__dirname, '../', relativePath)

            await generatePDF(html, pdfPath);
        } else if(format_type == 'docx') {
            relativePath = `/usermedia/generator.docx`;
            const docxPath = path.join(__dirname, '../', relativePath)

            await generateDocx(form, docxPath);
        } else {
            throw new Error('Invalid file type');
        }

        res.send({ pdf_path: relativePath });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating PDF');
    }
}

// Generate PDF
const generatePDF = async (htmlContent, pdfPath) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

     // Generate PDF as a buffer

    const pdf = await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
    });

    console.log('PDF generated successfully:', pdf.length, 'bytes');

    await browser.close();
};

// Generate DOCX
const generateDocx = (content, filePath) => {
    const doc = new Document({
        sections: [
            {
                children: [
                    new Paragraph({
                        children: [new TextRun(content)],
                    }),
                ],
            },
        ],
    });

    return Packer.toBuffer(doc).then(buffer => {
        fs.writeFileSync(filePath, buffer);
        console.log(`DOCX file saved at: ${filePath}`);
        return filePath; // Return the file path
    });
};

exports.readTemplateFile = async (req, res) => {

    const pdfTemplatePath = path.join(__dirname, '../../client/template/pdf.template');
    const pdfFields = path.join(__dirname, '../usermedia', fieldsFileName);

    try {
        fs.readFile(pdfTemplatePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading the file:', err);
                res.status(500).send('Error a reading file');
                return;
            }

            const templateContent = data
                .split('\n') // Split the content into lines
                .filter(line => !line.trim().startsWith('<script id="pdfcontent"') && !line.trim().startsWith('</div></script>'))
                .join('\n').trim(); // Join the filtered lines back into a single string

            if (fs.existsSync(pdfFields)) {
                fs.readFile(pdfFields, 'utf8', (err, fieldsData) => {
                    if (err) {
                        console.error('Error reading the file:', err);
                        res.status(500).send('Error a reading file');
                        return;
                    }

                    const response = {
                        template: templateContent,
                        fields: JSON.parse(fieldsData),
                    };

                    res.json(response)
                });
            } else {
                const response = {
                    template: templateContent,
                    fields: [],
                };
                res.json(response)
            }

        });

    } catch (error) {
        res.status(500).send({ error: error.message });

    }



}

exports.updatePDFTemplateContent = async (req, res) => {
    const { template } = req.body;
    try {
        const templateContent = `<script id="pdfcontent" type="text/template"><div class="pdf-template">\n${template}\n</div></script>`

        const pdfTemplatePath = path.join(__dirname, '../../client/template/pdf.template');

        fs.writeFile(pdfTemplatePath, templateContent, 'utf8', (err) => {
            if (err) {
                console.error('Error writing the file:', err);
                res.status(500).send('Error a writing file');
                return;
            }

            //compile pdf file
            templateConpile.compileTemplate(config.templateConfig.pages.pdfgenerator);
            res.send({ message: 'File updated successfully!' })
        });


    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}

exports.updatePDFField = async (req, res) => {
    const { field } = req.body;
    const pdfFields = path.join(__dirname, '../usermedia', fieldsFileName);

    try {

        if (fs.existsSync(pdfFields)) {

            fs.readFile(pdfFields, 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading the file:', err);
                    return;
                }

                let jsonContent = [];
                try {
                    jsonContent = JSON.parse(data);
                } catch (parseError) {
                    console.error('Error parsing JSON. Reinitializing file.');
                }

                jsonContent.push(field);

                // Write the updated JSON back to the file
                fs.writeFile(pdfFields, JSON.stringify(jsonContent, null, 4), 'utf8', (writeErr) => {
                    if (writeErr) {
                        console.error('Error writing to the file:', writeErr);
                    } else {
                        console.log('Object added to the JSON file successfully!');
                        res.json({ message: 'PDF JSON updated successfully!', fields : jsonContent });
                    }
                });
            });
        } else {

            const initialContent = [field];

            fs.writeFile(pdfFields, JSON.stringify(initialContent, null, 4), 'utf8', (err) => {
                if (err) {
                    console.error('Error writing the json file:', err);
                    res.status(500).send('Error a writing json file');
                    return;
                }
    
                //compile pdf file
                res.json({ message: 'PDF JSON created successfully!', fields : initialContent })
            });

        }

    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}

// Delete a field from the JSON file
exports.deletePDFField = (req, res) => {
  
    const fieldsFilePath = path.join(__dirname, '../usermedia', fieldsFileName);

    fs.readFile(fieldsFilePath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading fields file:", err);
        return res.status(500).json({ error: "Failed to load fields" });
      }
  
      let fields = JSON.parse(data);
      const fieldIndex = fields.findIndex((field) => field.field_id === req.params.id);
  
      if (fieldIndex === -1) {
        return res.status(404).json({ error: "Field not found" });
      }
  
      fields.splice(fieldIndex, 1); // Remove the field
  
      // Write updated fields back to the file
      fs.writeFile(fieldsFilePath, JSON.stringify(fields, null, 2), (writeErr) => {
        if (writeErr) {
          console.error("Error writing fields file:", writeErr);
          return res.status(500).json({ error: "Failed to update fields" });
        }
  
        res.json({ 
            message: "Field deleted successfully", 
            fields
        });
      });
    });
  };