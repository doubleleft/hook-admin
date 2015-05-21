var inflection = require('inflection'),
    fieldTypes = require('./field_types');

module.exports = class Entity extends Array {

  constructor(name, configs) {
    super();

    this._cache = {};

    if (configs && configs.attributes) {
      for (let i in configs.attributes) {
        this.add(configs.attributes[i]);
      }

      this.belongsTo = this.parseRelations(configs.relationships && configs.relationships.belongs_to);
      this.hasMany = this.parseRelations(configs.relationships && configs.relationships.has_many);
    }
  }

  add(...fields) {
    for (let i = 0; i < fields.length; i++) {
      let field = fields[i];
      if (typeof(field)=="string") {
        field = { name: field };
      }

      this._cache[ field.name ] = field;
      this.push(this.sanitizeField(field));
    }
  }

  field(name) {
    return this._cache[ name ];
  }

  has(name) {
    return this._cache[ name ] || false;
  }

  merge(fields) {
    for (let i = 0; i < fields.length; i++) {
      if (!this.has(fields[i].name)) {
        this.add(fields[i]);
      } else {
        let field = this.field(fields[i].name);
        for (let k in fields[i]) {
          field[k] = fields[i][k];
        }
      }
    }
  }

  //
  // Protected functions
  //
  parseRelations(relationships) {
    if (relationships) {
      if (typeof(relationships)==="string") {
        relationships = [relationships];
      }
    } else {
      relationships = false;
    }
    return relationships;
  }

  sanitizeField(field) {
    let type = field.type;
    field.type = fieldTypes.get(type);

    // detect custom template field types
    if (field.type == "string" && field.template) {
      let template = field.template;
      field.type = "template";
      field.template = "<"+template+"></"+template+">";
    }

    // translate 'allowed' schema option to ng-admin compatible 'choices'
    if (field.type == "choices") {
      let allowed = field.allowed,
          choices = [];
      for (let i=0; i<allowed.length; i++) {
        choices.push({
          label: allowed[i],
          value: allowed[i]
        })
      }
      field.choices = choices;
      delete field.allowed;
    }

    return field;
  }

}
