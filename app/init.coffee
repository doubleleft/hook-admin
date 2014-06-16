# Used only for initialization
App = require 'app'

# Uses jQuery onload handler
$ ->
  app = new App()
  app.init()
