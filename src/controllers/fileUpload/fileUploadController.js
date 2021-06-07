const HttpStatus = require('http-status-codes');

const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const path = require('path');
const crypto = require('crypto');

const {success} = require('../../helpers/response');
const {ErrorHandler} = require('../../errorHandlers');

const {aws: awsConfig, awsLambdaFilePath} = require('../../config');
const {
  FILE_UPLOAD_SOURCES,
  COMMON_MAX_FILE_UPLOAD_SIZE,
  LANGUAGE_KEYS,
  ALLOWED_IMAGE_TYPES,
  DEFAULT_IMAGE_TYPE,
} = require('../../helpers/constants');
const {catchErrors} = require('../../errorHandlers');
const fileUploadService = require('../../services/fileUploadServices');

AWS.config.update(awsConfig);
const s3 = new AWS.S3();

const getCurrentFileObject = async reference => {
  const currentFileObject = FILE_UPLOAD_SOURCES.find(
    item => item.REF === reference,
  );
  currentFileObject.fullPath = awsConfig.bucket + currentFileObject.FILE_PATH;
  return currentFileObject;
};

function getFileType(req, file, cb) {
  let fileMimeType;
  if (file && file.mimetype) {
    fileMimeType = file.mimetype;
  } else {
    fileMimeType = 'application/octet-stream';
  }

  cb(null, fileMimeType);
}

const uploadFile = async (request, res, currentFileObject) => {
  const bucket = currentFileObject.fullPath;
  const uploadLimit =
    currentFileObject.MAX_FILE_UPLOAD_SIZE || COMMON_MAX_FILE_UPLOAD_SIZE;

  const uploadResult = multer({
    storage: multerS3({
      s3,
      bucket,
      contentType: getFileType,
      key(req, file, cb) {
        if (!file) {
          throw new ErrorHandler(
            HttpStatus.BAD_REQUEST,
            req.t(LANGUAGE_KEYS.COMMON_FILE_REQUIRE_ERROR),
          );
        }
        crypto.pseudoRandomBytes(16, function(err, raw) {
          cb(
            null,
            `${Date.now()}_${raw.toString('hex')}${path.extname(
              file.originalname,
            )}`,
          );
        });
      },
    }),
    limits: {fileSize: uploadLimit},
  }).array('file');

  return new Promise(function(resolve, reject) {
    uploadResult(request, res, function(err) {
      if (err) {
        catchErrors(new ErrorHandler(HttpStatus.BAD_REQUEST, err));
      }
      resolve([request, s3]);
    });
  });
};

/**
 * Execute the file data
 * @author Salini
 * @return json
 * @createdOn 07-Feb-2020
 */

const validateAndCreateResponse = async (req, currentFileObject) => {
  const DataArray = req.files;
  if (!(DataArray.length > 0)) {
    throw new ErrorHandler(
      HttpStatus.BAD_REQUEST,
      req.t(LANGUAGE_KEYS.COMMON_FILE_REQUIRE_ERROR),
    );
  }

  const response = DataArray.map(item => {
    const fileKey = item.key;

    const fileKeyThumb = ALLOWED_IMAGE_TYPES.includes(fileKey.split('.').pop())
      ? fileKey
      : `${fileKey.substr(0, fileKey.lastIndexOf('.'))}.${DEFAULT_IMAGE_TYPE}`;

    return {
      name: item.originalname,
      key: item.key,
      filePath: `${awsLambdaFilePath + currentFileObject.FILE_PATH}/${
        item.key
      }`,
      thumbnailFilePath: `${awsLambdaFilePath +
        currentFileObject.THUMB_FILE_PATH}/${fileKeyThumb}`,
    };
  });
  return response;
};

/**
 * Do File Upload
 * @author Salini L
 * @return json
 * @createdOn 06-Feb-2020
 */

async function upload(req, res) {
  const tenantId = req.headers['tenant-id'];
  const currentFileObject = await getCurrentFileObject(req.headers.reference);
  const [reqFile] = await uploadFile(req, res, currentFileObject);
  const ResponseData = await validateAndCreateResponse(
    reqFile,
    currentFileObject,
  );

  if (ResponseData.length > 0) {
    fileUploadService.resourceTagging(
      currentFileObject,
      ResponseData,
      tenantId,
    );
  }

  success(
    req,
    res,
    HttpStatus.OK,
    ResponseData,
    req.t(LANGUAGE_KEYS.COMMON_FILE_UPLOAD_SUCCESS),
  );
}

module.exports = {
  upload,
};
