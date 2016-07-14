var util = {};

util.capitalize = function(str) {
  var firstChar = str.charAt(0).toUpperCase();
  return firstChar + str.substr(1, str.length - 1);
};

util.ensureArray = function(possibleArray) {
  if(_.isArray(possibleArray)) {
    return possibleArray;
  }
  return [possibleArray];
};

util.formatString = function (string, params) {
  var re;
  for(var key in params) {
    re = new RegExp("#{" + key + "}", "g");
    string = string.replace(re, params[key]);
  }
  return string;
};

util.keyify = function(object) {
  var keys = Object.keys(object).sort();
  var keysAndVals = keys.map(function(key) {
    var val = object[key];
    return util.formatString('"#{key}":"#{val}"', {key: key, val: val});
  });
  return "{" + keysAndVals.join(",") + "}";
};

util.Set = function(array) {
  // An ordered, efficient unique array-like
  this.hash = {};
  this.array = [];
  this.length = 0;
  var self = this;
  if(array) {
    this.array = _.clone(array);
    this.array.forEach(function(key) {
      self.hash[key] = true;
    });
    this.length = this.array.length;
  }
};

_.extend(util.Set.prototype, {
  toArray: function() {
    var self = this;
    this.array = _.filter(this.array, function(key) {
      return self.has(key);
    });
    return this.array;
  },

  forEach: function(iterator) {
    var self = this;
    var updatedArray = [];
    return this.array.forEach(function(key) {
      if(self.has(key)) {
        iterator(key);
        updatedArray.push(key);
      }
    });
    this.array = updatedArray;
  },

  deplete: function(count, iterator) {
    var i = 0;
    var found = 0;
    var key;
    while(found < count && i < this.array.length) {
      key = this.array[i];
      if(this.has(key)) {
        found++;
        iterator(key);
      }
      i++;
    }
    this.array = this.array.slice(i);
    this.length -= found;
  },

  has: function(key) {
    return this.hash[key] === true;
  },

  add: function(key) {
    if(!this.has(key)) {
      this.array.push(key);
      this.hash[key] = true;
    }
    this.length++;
  },

  remove: function(key) {
    if(this.has(key)) {
      delete this.hash[key];
      this.length--;
    }
  }
});
