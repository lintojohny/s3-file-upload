const AWS = require('aws-sdk');
const {RESOURCE_TAG_KEY} = require('../../helpers/constants');
const getInstitutionById = require('../institution/getInstitutionByIdService');
const {getConfigrations} = require('../common/config/getConfigService');
const {aws: awsConfig} = require('../../config');

const s3 = new AWS.S3();

/**
 * For s3 resource tagging
 * @param {Object} currentFileObject
 * @param {Object} ResponseData
 * @param {Integer} tenantId
 * @return json
 */
async function resourceTagging(currentFileObject, ResponseData, tenantId) {
  const Institution = await getInstitutionById(tenantId);
  const config = await getConfigrations();
  const nurseryTag = config.find(item => item.key === RESOURCE_TAG_KEY);

  const folderPath = currentFileObject.FILE_PATH.startsWith('/')
    ? currentFileObject.FILE_PATH.substring(1)
    : currentFileObject.FILE_PATH;

  const objectTagging = params =>
    new Promise((resolve, reject) => {
      s3.putObjectTagging(params, function(err, data) {
        if (err) return reject(err);
        resolve(data);
      });
    });
  const parameters = {
    Bucket: awsConfig.bucket,
    Key: `${folderPath}/${ResponseData[0].key}`,
    Tagging: {
      TagSet: [
        {
          Key: nurseryTag.value,
          Value: Institution ? Institution.nameEn : '',
        },
      ],
    },
  };

  await objectTagging(parameters);
}

module.exports = {
  resourceTagging,
};
