# Your modules
DLAdmin = require "dl-admin"

module.exports = class App
  constructor: ->
    # console.log "App constructor"

  init: ->
    # console.log "App init"
    window.dl = new DL.Client( window.CONFIG_API );

    admin = new DLAdmin()

    admin.addModel(
      {
        name: "Categorias",
        collection: "dlacategories", 
        editable: true,
        fields: [
          {name:"name", type:"text"}, 
          {name:"description", type:"text", multiLine: true}
        ],
        relationships: [
          {type: "has_many", collection: "dlaposts", sourceField:"_id", targetField: "category_id"}
        ]
      }
    )

    admin.addModel(
      {
        name: "Artigos",
        collection: "dlaposts",
        editable: true,
        fields: [
          {name:"text", type:"text", multiLine: true},
          {name:"image", type:"image"}
        ],
        relationships: [
          {type: "belongs_to", collection: "dlacategories", sourceField:"category_id", targetField: "_id"}
        ]
      }
    )


    admin.init()
