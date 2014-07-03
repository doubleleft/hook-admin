DLAdminCollection = require 'dl-admin/models/collection'

module.exports = class DLAdmin

  constructor: () ->
    if not window.dl? then console.error 'DLAdmin: dl-api-javascript needs to be available as window.dl'
    
    @nav = $("#admin-nav")
    @login = $("#admin-login")
    @logoutWidget = $("#admin-logout-widget")
    @content = $("#admin-content")
    @models = {}
    @defaultModel = null

    $("nav").click @onContentClick
    @content.click @onContentClick
    @login.click @onContentClick

    window.addEventListener "popstate", (e) =>
      @updateLocation()

  # General content click handler 
  # (handles pretty much everything \o/)
  onContentClick: (e) =>

    # Fugly hack \o/
    method = $(e.target).data("method")
    if method?
      # console.log method, params
      params = $(e.target).data("params")
      if not params?
        @[method]()
      else
        @[method](params)
      return false

    # Usual collection flow, (edit/view/create)
    collection = $(e.target).data("target")
    if not collection? then return

    whereField = $(e.target).data("where-field")
    whereID = $(e.target).data("where-id")
    mode =  $(e.target).data("mode")

    if mode == 'save'
      @save(collection, whereID)
    else
      @show(collection, whereField, whereID, mode)

    false

  init: () ->
    @updateLocation()

  # History
  # Note: location hash # is being used to avoid relative path conflicts
  updateLocation: () ->

    hash = location.hash.split("/")
    window.m = @models
    # Weird hashes or empty location
    # Show first collection as a fallback
    if hash.length <= 1
      @show @defaultModel.collection, null, null, null, false
      return

    method = hash[1]
    collection = hash[2]
    if hash.length >= 4
      where = hash[3].split('~')
      whereField = if where.length <= 1 then '_id' else where[0]
      whereID = if where.length <= 1 then where[0] else where[1]
    else
      whereField = whereID = null

    @show collection, whereField, whereID, method, false

  addModel: (modelObject) ->
    newModel = new DLAdminCollection(modelObject)
    if not @defaultModel? then @defaultModel = newModel
    @models[newModel.collection] = newModel
    @nav.append("<li><a href='#' data-target='#{newModel.collection}'>#{newModel.name}</a></li>")


  # Authentication
  authenticate: () ->
    $(".alert", @login).remove()
    $("button[type=submit]", @login).addClass("disabled")

    adminEmail = $("#adminEmail", @login).val()
    adminPassword = $("#adminPassword", @login).val()

    dl.auth.login('email', {email: adminEmail, password: adminPassword}).then(@onAuthSuccess, @onAuthFail)
      
  onAuthSuccess: () =>
    @updateLocation()
    # $(".dropdown-toggle", @loginWidget).html "#{dl.auth.currentUser.email} <b class=\"caret\"></b>"
    
    # Re-enable login button
    $("button[type=submit]", @login).removeClass("disabled")

  onAuthFail: () =>
    @login.append '<div class="alert alert-danger alert-dismissable">
      <button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
      <strong>Uepa!</strong> Não foi possível se autenticar. Por favor verifique seus dados e tente novamente \\o/
      </div>'
    # Re-enable login button
    $("button[type=submit]", @login).removeClass("disabled")

  logout: () =>
    dl.auth.logout()
    @content.html("")
    @updateLocation()

  show: (collectionName, whereField, whereID, method, updateHistory = true) ->

    # console.log collectionName, whereField, whereID, method, updateHistory

    # Auth verification (terrible!)
    if dl.auth.currentUser?
      @login.hide()
      $(".dropdown-toggle", @loginWidget).html "#{dl.auth.currentUser.email} <b class=\"caret\"></b>"
      @logoutWidget.show()
    else
      @login.show()
      @logoutWidget.hide()
      return
    
    # Visualization methods (view / edit)
    if not method? then method = "view"

    # History
    if updateHistory
      if whereID?
        history.pushState(null, null, "#/#{method}/#{collectionName}/#{whereField}~#{whereID}")
      else
        history.pushState(null, null, "#/#{method}/#{collectionName}")

    # Clear content
    @content.html("<img class='loading' src='./images/loading.gif'>")
    model = @models[collectionName]

    # Highlight item on nav
    $("nav li").removeClass("active")
    $("nav li a[data-target=#{collectionName}]").parent().addClass("active")

    # Handle creation of models with / without relationships
    if method == 'create'
      belongs_to = relationship for relationship in model.relationships when relationship.type == 'belongs_to'
      if not belongs_to?
        @showModelCreate(model, null, whereField, whereID)
      else
        # {type: "belongs_to", collection: "hwcconversations", sourceField:"conversation_id", targetField: "id"}
        # console.log belongs_to
        apiCall = dl.collection(belongs_to.collection)
        apiCall.get().then (data) =>
          @showModelCreate(model, data, whereField, whereID)
      return
    
    # Build API call
    apiCall = dl.collection(collectionName)

    # Apply filter when supplied, terrible field names ftw
    if whereField? and whereID?
      apiCall.where(whereField, whereID)
    
    apiCall.get().then (data) =>
      switch method
        when "view" then @showModelView(model, data, whereField, whereID)
        when "edit" then @showModelEdit(model, data, whereField, whereID)

  save: (collectionName, whereID) ->

    # Disable buttons
    $("button", @content).addClass("disabled")

    # @content.html("Saving ...")
    model = @models[collectionName]

    # Build API call
    apiCall = dl.collection(collectionName)

    # Set parameters based on form field types and ids (defined in @showModelEdit)
    updateParams = {}
    $("input, textarea", @content).each (index, element) ->
      includeField = true
      fieldName = $(element).attr("id").substr(1);
      # console.log fieldName

      # dl-api-javascript treats base64 uploads automatically
      if $(element).attr('type') == 'file'
        # console.log "[data-field=_#{fieldName}]"
        if element.files.length  == 1
          fieldValue = element
        else if $("[data-field=_#{fieldName}]").length == 0  # No special inputs, remove image
          fieldValue = null
        else  # Image not updated or not supplied
          includeField = false
      else  
        fieldValue = $(element).val()

      if includeField then updateParams[fieldName] = fieldValue

    # console.log updateParams

    if not whereID?
      apiCall.create(updateParams).then (data) =>
        window.history.back()
    else
      apiCall.update(whereID, updateParams).then (data) =>
        $("button", @content).removeClass("disabled")
        @updateLocation()


  showModelView: (model, data, whereField, whereID) =>

    # Start building table
    table = $('<table class="table table-striped"></table>')

    # Build header based on fields and relationships
    header = $('<tr></tr>')

    # Fields
    for field in model.fields
      header.append "<th>#{field.label}</th>"

    # Relationships
    for relationship in model.relationships
      if relationship.type == "has_many"
        header.append "<th></th>" # "<th>#{relationship.collection}</th>"
      else
        # table.prepend "<a href='#' class='btn btn-default' data-target='#{relationship.collection}'>Voltar</a><br>"

    # Last column - edit buttons
    header.append "<th></th>"

    # Header ready
    table.append header

    # Get and format data
    for object in data
      # Create and format row
      row = $('<tr></tr>')

      # Fields
      for field in model.fields
        switch field.type
          when "text"
            row.append "<td>#{object[field.name]}</td>"
          when "date"
            d = new Date(object[field.name] * 1000)
            formattedDate = "#{d.getDate()}/#{d.getMonth()+1}/#{d.getFullYear()} #{d.getHours()}:#{d.getMinutes()}"

            row.append "<td>#{formattedDate}</td>"
          when "image"
            if object[field.name]?
              row.append "<td><img src='#{object[field.name]}' width='100'></td>"
            else
              row.append "<td>-</td>"
          else
            row.append "<td>-</td>"
      
      # Relationships
      for relationship in model.relationships
        if relationship.type == "has_many"
          targetModel = @models[relationship.collection]
          row.append "<td><a href='#' class='btn btn-info' data-target='#{targetModel.collection}' data-where-field='#{relationship.targetField}' data-where-id='#{object[relationship.sourceField]}'>#{targetModel.name}</a></td>"
      
      # Edit buttons
      if model.editable
        row.append "<td><button type='button' class='btn btn-default' data-target='#{model.collection}' data-where-field='_id' data-where-id='#{object._id}' data-mode='edit'><span class='glyphicon glyphicon-pencil'></span> Editar</button></td>"
      # row.append "<td><button type='button' class='btn btn-danger'><span class='glyphicon glyphicon-trash'></span> Apagar</button></td>"

      # Append, keep going
      table.append row

    # Output
    @content.html ""
    
    # Add button
    belongs_to = relationship for relationship in model.relationships when relationship.type == 'belongs_to'
    if not belongs_to? or ( whereField? and whereID? )
      @content.append "<div class='btn-toolbar' role='toolbar' style='margin: 10px 0; float:right;'>
        <button type='button' class='btn btn-primary' data-target='#{model.collection}' data-mode='create' data-where-field='#{whereField}' data-where-id='#{whereID}'>
        <span class='glyphicon glyphicon-plus'></span> Adicionar</button></div>"
    
    # Append built table \o/
    @content.append "<h1>#{model.name}</h1>"
    @content.append table



  showModelEdit: (model, data, whereField, whereID) =>
    @content.html ".... "
    if data.length != 1
      @content.html "OMGAWD!"
      return

    # Start building edit form
    form = $('<form role="form"></form>')

    # Get and format data (single object - edit mode)
    object = data[0]
    # console.log object

    # Fields
    for field in model.fields

      # console.log "fields #{model.fields.length}, #{field.name}, #{field.type}"
      input = $('<div class="form-group"></div>')
      inputID = "_#{field.name}"
      inputValue = object[field.name]

      input.append "<label for='#{inputID}'>#{field.label}</label>"
      if field.type == "text"
        multiLine = if field.multiLine? then field.multiLine else false
        if multiLine
          input.append "<textarea class='form-control' rows='3' id='#{inputID}'>#{inputValue}</textarea>"
        else
          input.append "<input type='text' class='form-control' id='#{inputID}' value='#{inputValue}'>"
          

      if field.type == "image"
        if inputValue?
          input.append "<br><button type='button' class='btn btn-xs btn-default' data-method='removeImage' data-params='#{inputID}' data-field='#{inputID}'><span class='glyphicon glyphicon-trash'></span> Remover imagem</button><br>"
          input.append "<br><img src='#{inputValue}' data-field='#{inputID}' />"
        input.append "<input type='file' id='#{inputID}'>"
        
        # input.append '<p class="help-block">Dica: blablabla</p>'
      # else 
        # input.append "<input type='text' class='form-control' id='#{inputID}' value='#{object[field.name]}'>"

      form.append input

    # Edit buttons
    form.append "<button type='button' class='btn btn-default' data-target='#{model.collection}' data-where-field='_id' data-where-id='#{object._id}' data-mode='save'><span class='glyphicon glyphicon-floppy-disk'></span> Salvar</button>"
    # form.append "<button type='button' class='btn btn-danger'><span class='glyphicon glyphicon-trash'></span> Apagar</button>"

    # Append built form \o/
    @content.html '<h1>Editar</h1>'
    @content.append form

    # console.log 'OK \o/'


  removeImage: (fieldAttrValue)=>
    # console.log ("[data-field=#{fieldAttrValue}]")
    $("[data-field=#{fieldAttrValue}]").remove()
    return


  showModelCreate: (model, data, whereField, whereID) =>
    @content.html "..."

    # Start building create form
    form = $('<form role="form"></form>')

    # Fixed hidden field (belongs_to relationship)
    if whereField? and whereID? and whereField != 'undefined' and whereID != 'undefined' # :'(
      form.append "<input type='hidden' id='_#{whereField}' value='#{whereID}'>"

    # Fields
    for field in model.fields
      # console.log "fields #{model.fields.length}, #{field.name}, #{field.type}"
      input = $('<div class="form-group"></div>')
      inputID = "_#{field.name}"
      input.append "<label for='#{inputID}'>#{field.label}</label>"
      if field.type == "text"
        multiLine = if field.multiLine? then field.multiLine else false
        if multiLine
          input.append "<textarea class='form-control' rows='3' id='#{inputID}'></textarea>"
        else
          input.append "<input type='text' class='form-control' id='#{inputID}'>"
          

      if field.type == "image"
        if inputValue?
          input.append "<br><button type='button' class='btn btn-xs btn-default' data-method='removeImage' data-params='#{inputID}' data-field='#{inputID}'><span class='glyphicon glyphicon-trash'></span> Remover imagem</button><br>"
          input.append "<br><img src='#{inputValue}' data-field='#{inputID}' />"
        input.append "<input type='file' id='#{inputID}'>"
        
        # input.append '<p class="help-block">Dica: blablabla</p>'
      # else 
        # input.append "<input type='text' class='form-control' id='#{inputID}' value='#{object[field.name]}'>"

      form.append input

    # Edit buttons
    form.append "<button type='button' class='btn btn-default' data-target='#{model.collection}' data-mode='save'><span class='glyphicon glyphicon-plus'></span> Adicionar</button>"
    # form.append "<button type='button' class='btn btn-danger'><span class='glyphicon glyphicon-trash'></span> Apagar</button>"

    # Append built form \o/
    @content.html '<h1>Adicionar</h1>'
    @content.append form