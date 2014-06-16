dl-api-admin
============
Administrative interface built on top of [dl-api-javascript](https://github.com/doubleleft/dl-api-javascript) and [Bootstrap](http://getbootstrap.com/).

Setup
-----
Note that NodeJS (`brew install nodejs`) and Ruby 2.0 are required.
    
    bundle install
    npm install -g brunch
    npm install

Development
-----------

    bundle exec brunch watch --server


Open your development server at [http://localhost:3333](). Remember auto-reload is enabled by default, so any changes to the project will refresh your browser.


### API Environment for Development

By default this project uses the `dl-api-admin-ddll` app.

The default login credentials are:

    username: admin@doubleleft.com
    password: 123

Example
-------

Use `app/assets/index.html` and `app/app.coffee` as a starting point.

The syntax is the same for CoffeeScript and JavaScript usage.


    // Initialize dl-api
    window.dl = new DL.Client( ......  )

    // Create new dl-api-admin instance
    admin = new DLAdmin()

    // Add your models
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

    // Initialize dl-api-admin after models have been set
    admin.init()