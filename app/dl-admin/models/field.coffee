module.exports = class DLAdminField

  # Represents a field in the admin interface
  # Fields determine model creation, listing and editing
  # {name, type, multiLine}

  constructor: (config) ->
    @name = config.name
    @type = config.type || 'text'

    if not @name? then console.error 'DLAdminField: undefined field name'

    # Text fields only
    @multiLine = config.multiLine || false
