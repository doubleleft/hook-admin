module.exports = {
  filters: {},

  register: function(name, filter) {
    this.filters[name] = filter;
  },

  get: function(name) {
    return this.filters[name];
  }

};
