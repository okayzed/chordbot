
var MIXTURES = {};

var MAJ_KEYS = ["IV", "iii", "ii", "vii", "vi", "V", "I" ];
var MIN_KEYS = ["vii", "Im", "ii", "III", "iv", "VI", "V" ];

var types = [ "simple", "secondary", "double" ];
MIXTURES.simple = {
  "Im" : "I",
  "I" : "Im",
  "ii" : "biiM",
  "iv" : "IV",
  "V" : "Vm",
  "IV" : "IVm",
  // changing root
  "iii" : "biiiM",
  "III" : "IIIm",
  "vi" : "bviM",
  "VI" : "vim",
  "vii" : "bviiM"
};

MIXTURES.secondary = {
  "ii": "iiM",
  "iii" : "iiiM",
  "vi" : "viM",
  "vii" : "viiM",
  "III": "biiim",
  "VI": "bvim",
  "VII" : "bviim"
};

MIXTURES.double = {
  "ii" : "biim",
  "iii" : "biiim",
  "vi" : "bvim",
  "vii" : "bviim",
  "III" : "iiiM",
  "VI" : "viM",
  "VII" : "viiM"
};

var LOOKUPS = { };
var ALL_LOOKUPS = {};
LOOKUPS.original = {};

_.each(MAJ_KEYS, function(key) {
  LOOKUPS.original[key] = key;
  if (!ALL_LOOKUPS[key]) { ALL_LOOKUPS[key] = []; }
  ALL_LOOKUPS[key].push({
    orig: key,
    from: 'original'
  });
});

_.each(MIN_KEYS, function(key) {
  LOOKUPS.original[key] = key;
  if (!ALL_LOOKUPS[key]) { ALL_LOOKUPS[key] = []; }
  ALL_LOOKUPS[key].push({
    orig: key,
    from: 'original'
  });
});


_.each(['simple', 'secondary', 'double'], function(mixture_type) {
  var lookup = MIXTURES[mixture_type];
  LOOKUPS[mixture_type] = {};
  _.each(lookup, function(val, key) {
    LOOKUPS[mixture_type][val] = key;
    if (!ALL_LOOKUPS[val]) {
      ALL_LOOKUPS[val] = [];
    }

    ALL_LOOKUPS[val].push({
      orig: key,
      from: mixture_type
    });
  });
});


function replace_mixtures(labeling) {
  var new_labeling = [];
  _.each(labeling, function(label) {
    var maj_label = label.replace("7", "M");
    if (ALL_LOOKUPS[maj_label]) {
      // which label should we try?
      var orig_funcs = ALL_LOOKUPS[maj_label];
      new_labeling.push(orig_funcs[0].orig);
    } else {
      new_labeling.push(label);
    }

  });

  return new_labeling;
}

function find_mixtures(labeling) {
  var issues = {};

  _.each(labeling, function(label, index) {
    if (ALL_LOOKUPS[label]) {
      // which label should we try?
      var orig_funcs = ALL_LOOKUPS[label];
      issues[index] = orig_funcs[0].from;
    }

  });

  return issues;
}


module.exports = {
  replace: replace_mixtures,
  find: find_mixtures,
  is_mixture: function(label) {
    if (ALL_LOOKUPS[label]) {
      if (ALL_LOOKUPS[label].from !== 'original') {
        return true;
      }
    }

    return false;
  },
}
