# Your modules
DLAdmin = require "dl-admin"

module.exports = class App
  
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
          {name:"name", label:"Nome", type:"text"}, 
          {name:"description", label: "Descrição", type:"text", multiLine: true}
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
          {name:"text", label: "Texto", type:"text", multiLine: true},
          {name:"image", label: "Foto", type:"image"}
        ],
        relationships: [
          {type: "belongs_to", collection: "dlacategories", sourceField:"category_id", targetField: "_id"}
        ]
      }
    )


    admin.init()
