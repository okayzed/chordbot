var Progression = require("app/client/progression");
// grammar is from chord grammar and info on
// http://www.dangutwein.net/courses/mus201/handouts/har_mot.htm
var MAJOR_GRAMMAR = "iii | vi | ii IV | V vii | I";
var MINOR_GRAMMAR = "III | VI vi | ii IV iv | v V vii | Im i";
var mixtures = require("app/client/mixtures");
var grammar_matrix = require("app/client/grammar_matrix");

var CHORDS_IN_KEY = {};

// KEYS HAVE CHORD IS A LOOKUP THAT SHOWS WHAT OTHER KEYS CONTAIN A CHORD AND
// WHAT ITS FUNCTION IS
var KEYS_HAVE_CHORD = {};
var FUNCTIONS_FOR_KEY = {};


// Export some data structures into grammar matrix file so we can share it
// without sharing too much other deps
grammar_matrix.KEYS_HAVE_CHORD = KEYS_HAVE_CHORD;
grammar_matrix.KEYS_WITH_CHORD = KEYS_HAVE_CHORD;
grammar_matrix.FUNCTIONS_FOR_KEY = FUNCTIONS_FOR_KEY;
grammar_matrix.CHORDS_IN_KEY = CHORDS_IN_KEY;


var lookup = {
  "m" : "m",
  "M" : "M",
  "d" : "dim",
  "D" : "dom"
};

function build_chords_for_key(key) {
  var major_flavors = "MmmMMmd".split("");
  var minor_flavors = "mdMmmMD".split("");

  minor_flavors = _.map(minor_flavors, function(m) {
    return lookup[m];
  });

  major_flavors = _.map(major_flavors, function(m) {
    return lookup[m];
  });

  var major_functions = "I ii iii IV V vi vii".split(" ");
  var minor_functions = "Im ii III iv v VI vii".split(" ");

  var major_key = key + "M";
  var minor_key = key + "m";

  var major_chords = [];
  var minor_chords = [];

  FUNCTIONS_FOR_KEY[key] = {};
  FUNCTIONS_FOR_KEY[minor_key] = {};
  FUNCTIONS_FOR_KEY[major_key] = {};


  var minor_scale = teoria.note(key).scale('minor').simple();
  _.each(minor_scale, function(note, index) {
    var flavored_note = note + minor_flavors[index];
    minor_chords.push(flavored_note);

    if (!KEYS_HAVE_CHORD[flavored_note]) {
      KEYS_HAVE_CHORD[flavored_note] = {};
    }

    KEYS_HAVE_CHORD[flavored_note][minor_key] = index + 1;

    FUNCTIONS_FOR_KEY[minor_key][minor_functions[index]] = flavored_note;
    FUNCTIONS_FOR_KEY[key][minor_functions[index]] = flavored_note;
  });

  var major_scale = teoria.note(key).scale('major').simple();
  _.each(major_scale, function(note, index) {
    var flavored_note = note + major_flavors[index];
    major_chords.push(flavored_note);

    if (!KEYS_HAVE_CHORD[flavored_note]) {
      KEYS_HAVE_CHORD[flavored_note] = {};
    }

    KEYS_HAVE_CHORD[flavored_note][major_key] = index + 1;

    FUNCTIONS_FOR_KEY[major_key][major_functions[index]] = flavored_note;
    FUNCTIONS_FOR_KEY[key][major_functions[index]] = flavored_note;
  });

  CHORDS_IN_KEY[major_key] = major_chords;
  CHORDS_IN_KEY[minor_key] = minor_chords;

}

function build_chords_in_keys() {
  _.each("abcdefg", function(key) {
    build_chords_for_key(key);
    build_chords_for_key(key + "b");
    build_chords_for_key(key + "#");
  });

}

build_chords_in_keys();

function update_grammar_matrix(grammar, grammar_matrix, grammar_classes) {
  var tokens = grammar.split("|");
  tokens.reverse();

  _.each(tokens, function(token, index) {
    var functions = token.split(" ");
    _.each(functions, function(func) {
      if (!func.replace(" ", "")) {
        return;
      }

      grammar_matrix[func] = index;
      if (!grammar_classes[index]) {
        grammar_classes[index] = {};
      }

      grammar_classes[index][func] = 1;

    });
  });

}

// returns if there is a break or not
function check_grammar(prev_chord, chord, matrix) {
  var prev_class = matrix[prev_chord];
  var new_class = matrix[chord];

  if (prev_class !== 0) {
    if (prev_class < new_class) {
      return 1;
    }
  }
    
  return 0;
}

function add_grammar_to_candidates(candidates, func, grammar_matrix, grammar_classes) {
  if (grammar_matrix[func]) {
    var index = grammar_matrix[func];
    for (var i = Math.max(index-2, 0); i < index; i++) {
      _.each(grammar_classes[i], function(is_true, candidate) {
        candidates[candidate] = true;
      });
    }
  }

}

function get_progression_candidates(chord, key) {
  var candidates = {};
  var func = Progression.determine_function(chord, key);

  // We are pretending like b and # chords are substitutes for what they are on
  var stripped_func = func.replace(/[mM7]/, "").replace(/^[b#]/, "");

  _.each(GRAMMARS, function(grammar) {
    add_grammar_to_candidates(candidates, func, grammar.matrix, grammar.classes);
    add_grammar_to_candidates(candidates, stripped_func, grammar.matrix, grammar.classes);

  });

  if (func === "I" && GRAMMARS.major) {
    _.each(GRAMMARS.major.matrix, function(val, key) {
      candidates[key] = 1;
    });

  } else if ((func === "Im" || func === "i") && GRAMMARS.minor) {
    _.each(GRAMMARS.minor.matrix, function(val, key) {
      candidates[key] = 1;
    });

  } else if (func === "I" || func === "Im") {
    _.each(GRAMMARS, function(grammar) {
      if (typeof grammar.matrix[func] !== "undefined") {
        _.each(grammar.matrix, function(val, key) {
          candidates[key] = 1;
        });
      }
    });

  }

  return _.keys(candidates);
}

var cached_grammar_checks = {};
function check_progression_grammar(labeling) {
  labeling = mixtures.replace(labeling);

  var prev_chord;
  var misses = 0;
  var breaks = 0;
  var labeling_key = labeling.join(" ");

  if (cached_grammar_checks[labeling_key]) {
    return cached_grammar_checks[labeling_key];
  }

  var issues = {};

  _.each(labeling, function(chord, index) {
    chord = chord.replace("M6", "").replace("7", "");
    if (prev_chord) {
      if (prev_chord === chord) {
        return;
      }

      var miss = true;
      _.each(GRAMMARS, function(grammar) {
        var prev_in_major_grammar = _.contains(_.keys(grammar.matrix), prev_chord);
        var in_major_grammar = _.contains(_.keys(grammar.matrix), chord);

        if (in_major_grammar) {
          miss = false;
        }

        if (prev_in_major_grammar && in_major_grammar) {
          if (check_grammar(prev_chord, chord, grammar.matrix)) {
            // TODO: whenever there is a diatonic break, can we patch it up
            // with some chromaticisms?
            issues[index] = 'break';
          }
        }


      });

      if (miss) {
        issues[index] = 'miss';
      }
    }

    prev_chord = chord;
  });

  cached_grammar_checks[labeling_key] = issues;

  return issues;

}

var GRAMMARS = {};
function add_grammar(name, grammar) {
  console.log("ADDING GRAMMAR", name, grammar);
  var matrix = {};
  var classes = {};
  var grammar_obj = {
    name: name,
    grammar: grammar,
    classes: classes,
    matrix: matrix
  };

  GRAMMARS[name] = grammar_obj;
  update_grammar_matrix(grammar, matrix, classes);
  return grammar_obj;
}

module.exports = {
  reset_grammars: function() {
    console.log("RESETTING GRAMMARS");
    GRAMMARS = {};
    cached_grammar_checks = {};
  },
  add_grammar: add_grammar,
  check_progression_grammar: check_progression_grammar,
  get_progression_candidates: get_progression_candidates,
  KEYS_WITH_CHORD: KEYS_HAVE_CHORD,
  CHORDS_IN_KEY: CHORDS_IN_KEY,
  FUNCTIONS_FOR_KEY: FUNCTIONS_FOR_KEY,
  MAJOR_GRAMMAR: MAJOR_GRAMMAR,
  MINOR_GRAMMAR: MINOR_GRAMMAR
};
