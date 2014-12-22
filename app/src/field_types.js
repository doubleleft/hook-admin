var fieldTypeMap = {
  'boolean': "boolean",
  'date': "date",
  'date_time': "date",
  'time': "date",
  'timestamp': "date",
  'binary': "text",
  'text': "text",
  'medium_text': "text",
  'long_text': "text",
  'enum': 'choices',
  'char': "string",
  'string': "string",
  'float': "number",
  'double': "number",
  'decimal': "number",
  'integer': "number",
  'big_integer': "number",
  'medium_integer': "number",
  'tiny_integer': "number",
  'small_integer': "number"
};

module.exports = {
  get: function(type) {
    return (fieldTypeMap[type] || type);
  }
}
