//routes/pdfRoutes.js
const express = require('express');
const router = express.Router();

const pdfController = require('../controllers/pdfController');

router.post('/', pdfController.createPdf);
router.get('/template', pdfController.readTemplateFile);
router.post('/template', pdfController.updatePDFTemplateContent);
router.post('/fields', pdfController.updatePDFField);
router.delete('/fields/:id', pdfController.deletePDFField);

module.exports = router;
