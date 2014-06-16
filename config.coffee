exports.config =
  # See http://brunch.io/#documentation for docs.
  notifications: on

  files:
    javascripts:
      joinTo: 'javascripts/app.js': /^(vendor|app)/
    stylesheets:
      joinTo: 'stylesheets/main.css'
    templates:
      joinTo: 'javascripts/app.js'

  plugins:
    autoReload:
      enabled:
        js: on
        css: on
        assets: on

