const express = require('express');

const router = express.Router();
const healthRouter = require('./health');

const fileUpload = require('./fileUpload');

router.use('/health', healthRouter);
router.use('/fileUpload', fileUpload);

module.exports = router;
