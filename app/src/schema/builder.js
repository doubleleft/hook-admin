var inflection = require('inflection'),
    fieldTypes = require('./field_types'),
    Entity = require('./entity');

module.exports = function(config, appCollections) {
  var entities = {};

  for (let name in config) {
    entities[name] = new Entity(name, config[name]);
  }

  // merge appCollections fields with 'schema.yaml' attributes
  for (let name in appCollections) {
    if (!entities[name]) {
      entities[name] = new Entity(name);
    }

    // force hide collection
    if (appCollections[name] === false) {
      delete entities[name];
    } else {
      entities[name].merge(appCollections[name].fields || []);
    }
  }

  for (let name in entities) {
    // name = inflection.pluralize(name);

    // auto-add email on 'auths' collection
    if (inflection.pluralize(name) == 'auths') {
      entities[name].add({
        name: 'email',
        type: 'string'
      });
    }

    // add created_at and updated_at fields
    entities[name].add({
      name: 'created_at',
      type: 'date'
    }, {
      name: 'updated_at',
      type: 'date'
    });
  }

  return entities;
}
