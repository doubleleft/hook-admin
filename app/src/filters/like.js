module.exports = function(field, value, row) {
  var query = {};

  query[field] = {
    operation: "like",
    value: "%" + value + "%"
  };

  return query;
}
