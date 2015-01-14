module.exports = {
  actions: {},

  register: function(name, action) {
    this.actions[name] = action;
  },

  get: function(name) {
    return this.actions[name];
  }

};
