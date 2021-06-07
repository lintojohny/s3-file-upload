const express = require('express');

const router = express.Router();
const {catchErrors} = require('../errorHandlers');

const fileUploadController = require('../controllers/fileUpload/fileUploadController');

router.post('/', catchErrors(fileUploadController.upload));

module.exports = router;
