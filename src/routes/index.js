const express = require('express');

const router = express.Router();
const healthRouter = require('./health');

const captureScreen = require('./capture');

router.use('/health', healthRouter);


module.exports = router;
