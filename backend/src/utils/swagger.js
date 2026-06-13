const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const swaggerFilePath = path.join(__dirname, '../configs/swagger.yaml');

let swaggerDocument;
try {
  swaggerDocument = YAML.load(swaggerFilePath);
} catch (error) {
  console.warn('Swagger YAML file could not be parsed. API documentation might be unavailable:', error.message);
}

const setupSwagger = (app) => {
  if (swaggerDocument) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log('Swagger API Documentation available at http://localhost:5000/api-docs');
  }
};

module.exports = setupSwagger;
