DLAdminField = require 'dl-admin/models/field'

module.exports = class DLAdminCollection

  # Represents a collection in the admin interface
  # name (custom / localized name)
  # collection (dl-api collection name)
  # editable
  # fields [{name, type, multiLine}, {..}]
  # relationships [{type, collection, sourceField, targetField},  {..}]

  constructor: (config) ->
    @collection = config.collection

    if not @collection? then console.error 'DLAdminCollection: undefined collection'

    @name = config.name || config.collection
    @editable = config.editable || true

    # Parse fields
    @fields = []
    if not config.fields? or config.fields.length < 1 then console.error 'DLAdminCollection: please specify at least one field'

    for fieldConfig in config.fields
      @fields.push new DLAdminField(fieldConfig)

    # Parse relationships
    @relationships = config.relationships || []
