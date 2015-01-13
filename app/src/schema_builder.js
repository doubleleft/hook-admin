var YAML = require('yamljs'),
    inflection = require('inflection'),
    fieldTypes = require('./field_types');

function parseRelations(relationships) {
  if (relationships) {
    if (typeof(relationships)==="string") {
      relationships = [relationships];
    }
  } else {
    relationships = false;
  }
  return relationships;
}

module.exports = function(path) {
  var config = YAML.load(path);

  var entities = {};

  for (let name in config) {
    // name = inflection.pluralize(name);

    if (!config[ name ].attributes) {
      config[ name ].attributes = [];
    } else {

      // override attribute types based on 'field_types.js'
      for (var i=0;i<config[name].attributes.length;i++) {
        if (config[name].attributes[i].type) {
          config[name].attributes[i].type = fieldTypes.get(config[name].attributes[i].type);
        }
      }

    }

    // auto-add email on 'auths' collection
    if (inflection.pluralize(name) == 'auths') {
      config[ name ].attributes.push({
        name: 'email',
        type: 'string'
      });
    }

    // add created_at and updated_at fields
    config[ name ].attributes.push({
      name: 'created_at',
      type: 'date'
    }, {
      name: 'updated_at',
      type: 'date'
    });

    entities[ name ] = config[ name ].attributes;
    entities[ name ].belongsTo = parseRelations(
      config[name].relationships && config[name].relationships.belongs_to
    );
    entities[ name ].hasMany = parseRelations(
      config[name].relationships && config[name].relationships.has_many
    );
  }

  return entities;
}
