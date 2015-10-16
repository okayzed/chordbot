var Progression = require("app/client/progression");
// grammar is from chord grammar and info on
// http://www.dangutwein.net/courses/mus201/handouts/har_mot.htm
var MAJOR_GRAMMAR = "iii | vi | ii IV | V vii | I";
var MINOR_GRAMMAR = "III | VI vi | ii iv IV | v V vii | Im";
var MAJOR_GRAMMAR_MATRIX = {};
var MINOR_GRAMMAR_MATRIX = {};
var MAJOR_GRAMMAR_CLASSES = {};
var MINOR_GRAMMAR_CLASSES = {};

var CHORDS_IN_KEY = {};
var KEYS_HAVE_CHORD = {};


function build_chords_for_key(key) {
  var major_flavors = "MmmMMmm";
  var minor_flavors = "mmMmMMm";

  var major_key = key + "M";
  var minor_key = key + "m";

  for (var i = 0; i < major_flavors.length; i++) {
     
  }
}

function build_chords_in_keys() {
  _.each("ABCDEFG", function(key) {
    build_chords_for_key(key);
  });

}

function update_grammar_matrix(grammar, grammar_matrix) {
  var tokens = grammar.split("|");
  tokens.reverse();

  _.each(tokens, function(token, index) {
    var functions = token.split(" ");
    _.each(functions, function(func) {
      grammar_matrix[func] = index;

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

function add_grammar_to_candidates(candidates, func, grammar_matrix) {
  if (grammar_matrix[func]) {
    var index = grammar_matrix[func];
    for (var i = Math.max(index-3, 0); i < index-1; i++) {
      _.each(grammar_matrix[i], function(candidate) {
        candidates[candidate] = true;
      });
    }
  }

}

function get_progression_candidates(chord, key) {
  var candidates = {};
  var func = Progression.determine_function(chord, key);

  func = func.replace("m", "").replace("M", "");

  add_grammar_to_candidates(candidates, func, MAJOR_GRAMMAR_MATRIX);
  add_grammar_to_candidates(candidates, func, MINOR_GRAMMAR_MATRIX);

  if (func == "I") {

  } else if (func == "Im") {

  }

  return _.keys(candidates);
}

function check_progression_grammar(labeling) {
  var prev_chord;
  var misses = 0;
  var breaks = 0;

  _.each(labeling, function(chord) {
    chord = chord.replace("M6", "").replace("7", "");
    if (prev_chord) {
      var prev_in_major_grammar = _.contains(_.keys(MAJOR_GRAMMAR_MATRIX), prev_chord);
      var prev_in_minor_grammar = _.contains(_.keys(MINOR_GRAMMAR_MATRIX), prev_chord);

      var in_major_grammar = _.contains(_.keys(MAJOR_GRAMMAR_MATRIX), chord);
      var in_minor_grammar = _.contains(_.keys(MINOR_GRAMMAR_MATRIX), chord);

      if (prev_chord === chord) {
        return;
      }

      if (!in_major_grammar && !in_minor_grammar) {
        misses++;
        return;
      }

      if (prev_in_minor_grammar && in_minor_grammar) {
        breaks += check_grammar(prev_chord, chord, MINOR_GRAMMAR_MATRIX);
      }

      if (prev_in_major_grammar && in_major_grammar) {
        breaks += check_grammar(prev_chord, chord, MAJOR_GRAMMAR_MATRIX);
      }

    }

      
    
    prev_chord = chord;

  });

  return misses + breaks;

}

update_grammar_matrix(MAJOR_GRAMMAR, MAJOR_GRAMMAR_MATRIX);
update_grammar_matrix(MINOR_GRAMMAR, MINOR_GRAMMAR_MATRIX);

module.exports = {
  check_progression_grammar: check_progression_grammar,
  get_progression_candidates: get_progression_candidates
}
