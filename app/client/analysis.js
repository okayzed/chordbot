var grammar = require("app/client/grammar");

var major_progression = [ "I", "ii", "iii", "IV", "V", "vi", "vii" ];
var minor_progression = [ "Im", "ii", "iii", "iv", "V", "VI", "vii" ];
var Progression = require("app/client/progression");

var MIN_SUFFIX = "m";
var MAJ_SUFFIX = "M";
var DOM_SUFFIX = "dom";
var DIM_SUFFIX = "dim";
var AUG_SUFFIX = "+";

function get_simple_key(chord_ish) {
  var quality = "m";
  if (module.exports.chord_is_major(chord_ish)) {
    quality = "M";
  }

  return module.exports.get_chord_key(chord_ish) + quality;
}

function get_flavored_key(chord_ish, flavor) {
  if (typeof(chord_ish) === "string") {
    chord_ish = teoria.chord(chord_ish);
  }

  if (chord_ish.root) {
    if (!flavor) {
      var quality = chord_ish.quality();
      flavor = MAJ_SUFFIX;
      if (quality === "minor") {
        flavor = MIN_SUFFIX;
      }

      if (quality === "diminished") {
        flavor = DIM_SUFFIX;
      }

      if (quality === "dominant") {
        flavor = DOM_SUFFIX;
      }

      if (quality === "augmented") {
        flavor = AUG_SUFFIX;
      }
    }

    return chord_ish.root.name() + chord_ish.root.accidental() + flavor;
  }

  flavor = flavor || "M";
  return chord_ish.name() + chord_ish.accidental() + flavor;



}

function Counter() {
  var count = {};
  return {
    add: function(key, inc) {
      inc = inc || 1;
      count[key] = (count[key] || 0) + inc;

    },
    value: function(key) {
      return count[key] || 0;
    },
    raw: count
  }
}

function compare_likeliness(a, b) {
  return decide_progression_likeliness(b) - decide_progression_likeliness(a);
}

// likely chords:
// major
// I, IV, V, ii, iii, iv, vii
// minor
// i, ii, III, iv, V, VI, vii

// less likely contain flatted key (for now)
var MAJ_POINTS = {
    "IV" : 1,
    "iii": 1,
    "ii": 1,
    "vii": 1,
    "vi": 1,
    "V" : 1,
    "I" : 2,
    "sus" : -1,
    "b" : -1
};

var MIN_POINTS = {
    "vii" : 1,
    "Im" : 1,
    "ii": 1,
    "III": 1,
    "iv" : 1,
    "VI": 1,
    "V": 1,
    "sus" : -1,
    "b" : -1
};

var MAJ_KEYS = ["IV", "iii", "ii", "vii", "vi", "V", "I" ];
var MIN_KEYS = ["vii", "Im", "ii", "III", "iv", "VI", "V" ];

// returns the original func this came from
// and how many steps it took to get there
var cached_labelings = {};

var cached_harmoniousness = {};
function get_progression_harmoniousness(labeling) {
  var maj_points = 0, min_points = 0;
  var labeling_key = labeling.join(",");
  if (cached_harmoniousness[labeling_key]) {
    return cached_harmoniousness[labeling_key];
  }

  _.each(labeling, function(label) {
    var i;
    for (i = 0; i < MAJ_KEYS.length; i++) {
      var maj_pattern = "^" + MAJ_KEYS[i] + "|\W" + MAJ_KEYS[i];

      var max_re = new RegExp(maj_pattern);
      if (max_re.test(label)) {
        if (label === maj_pattern.replace("7", "")) {
          maj_points += 1;
        }
        maj_points += MAJ_POINTS[MAJ_KEYS[i]];
        break;
      }
    }

    for (i = 0; i < MIN_KEYS.length; i++) {
      var min_pattern = "^" + MIN_KEYS[i] + "|\W" + MIN_KEYS[i];
      var min_re = new RegExp(min_pattern);

      if (min_re.test(label)) {
        if (label === min_pattern.replace("7", "")) {
          min_points += 1;
        }
        min_points += MIN_POINTS[MIN_KEYS[i]];
        break;
      }
    }


  });

  cached_harmoniousness[labeling_key] = Math.max(maj_points, min_points);
  return cached_harmoniousness[labeling_key];
}

function check_progression_grammar(labeling) {
  return _.keys(grammar.check_progression_grammar(labeling)).length;

}

function get_progression_breaks(labeling) {
  return grammar.check_progression_grammar(labeling);
}

var likeliness_cache = {};

function decide_progression_likeliness(labeling) {
  var labeling_key = labeling.join(",");

  if (!likeliness_cache[labeling_key]) {
    likeliness_cache[labeling_key] = get_progression_harmoniousness(labeling) -
      (2 * check_progression_grammar(labeling));
  }

  return likeliness_cache[labeling_key];
}

function find_modulation_candidates(progression) {
  var current = {};
  var candidates = {};
  var modulation_candidates = {};

  var likely_labelings = {};

  var chords = progression.chord_list;
  for (var i = 0; i < chords.length; i++) {
    for (var j = i + 4; j < chords.length; j++) {
      if (j - i > 8) {
        break;
      }

      var candidate_key = i + ":" + j;
      var sub_chords = chords.slice(i, j);
      var labelings = module.exports.guess_progression_labelings(sub_chords);
      var current_labeling = progression.labeling.slice(i, j);

      current[candidate_key] = decide_progression_likeliness(current_labeling);
      var sorted_labelings = module.exports.rank_labelings(labelings);
      var max_labeling =  sorted_labelings[0];

      candidates[candidate_key] = decide_progression_likeliness(labelings[max_labeling]);
      likely_labelings[candidate_key] = max_labeling;


    }
  }

  function get_potential(key) {
    return candidates[key] - current[key];
  }

  var sorted_candidates = _.sortBy(_.keys(candidates), function(b, a) {
    return get_potential(b) - get_potential(a);
  });

  sorted_candidates.reverse();

  _.each(sorted_candidates, function(candidate_key) {
    if (get_potential(candidate_key) <= 0) {
      return;
    }

    var ends = candidate_key.split(":");
    var new_key = likely_labelings[candidate_key];

    for (i = ends[0]; i < ends[1]; i++) {
      if (!modulation_candidates[i]) { modulation_candidates[i] = {}; }
      if (!modulation_candidates[i][new_key]) { modulation_candidates[i][new_key] = 0; }

      modulation_candidates[i][new_key] += 1;

    }

  });

  return modulation_candidates;

}

function get_progression_candidate_chords(chord, key) {
  var candidates = grammar.get_progression_candidates(chord, module.exports.get_chord_key(key));
  return _.map(candidates, function(candidate) {
    return Progression.get_chord_for_function(candidate, module.exports.get_flavored_key(key));
  });
}




module.exports = {
  label_progression: function(chord_list, root) {
    var labeled_chords = [];
    var teoria = window.teoria;
    _.each(chord_list, function(chord) {
      var func_name = Progression.determine_function(chord, root);
      labeled_chords.push(func_name);
    });

    return labeled_chords;


  },
  guess_progression_labelings: function(chord_list) {
    var chord_key = chord_list.join(",");
    if (cached_labelings[chord_key]) {
      return cached_labelings[chord_key];
    }

    // Creates a bunch of progression objects for the labelings
    //
    // LABELINGS is a dict from key -> chord functions
    var labelings = {};

    // Build up a list of possible tonics for the progression
    var used_tonics = {};
    _.each(chord_list, function(chord) {
      var root = chord.simple()[0];
      if (used_tonics[root]) {
        return;
      }

      used_tonics[root] = true;
      var determined_progression = module.exports.label_progression(chord_list, root);
      labelings[root] = determined_progression;
    });

    cached_labelings[chord_key] = labelings;

    return labelings;
  },
  rank_labelings: function(labelings) {
    var ranked_labelings = _.sortBy(_.keys(labelings), function(key) {
      return -decide_progression_likeliness(labelings[key]);
    });

    return ranked_labelings;

  },
  get_possible_modulations: function(progression) {

    var now = Date.now();
    var modulation_candidates = find_modulation_candidates(progression);
    var delta = Date.now() - now;
    var modulations = {};
    var WITNESSES = 3;
    _.each(modulation_candidates, function(scores, index) {
      var keys = _.keys(scores);
      var sorted_keys = _.sortBy(keys, function(k) { return -scores[k]; });
      if (scores[sorted_keys[0]] > WITNESSES) {
        modulations[index] = sorted_keys[0];
      }

    });

    return modulations;

  },
  decide_progression_likeliness: decide_progression_likeliness,
  get_progression_harmoniousness: get_progression_harmoniousness,
  check_progression_grammar: check_progression_grammar,
  chord_is_major: function(chord_ish) {
    var name = module.exports.get_flavored_key(chord_ish);
    if (name.match("M") || name.match(DOM_SUFFIX)) {
      return true;
    }
  },
  get_chord_key: function(chord_ish) {
    if (typeof(chord_ish) === "string") {
      chord_ish = teoria.chord(chord_ish);
    }

    return chord_ish.root.name() + chord_ish.root.accidental();
  },
  get_flavored_key: get_flavored_key,
  get_chord_histograms: function(progression) {
    var key_hist = new Counter();
    var implied_hist = new Counter();
    var weighted_hist = new Counter();
    var implied_weighted = new Counter();

    var relative;

    function get_hists(chord_list) {
      _.each(chord_list, function(chord) {
        // TODO: normalize the chord
        // histogram of chord keys

        if (chord.quality() == "major" || chord.quality() == "dominant") {
          key_hist.add(get_flavored_key(chord, "M"));
          // add the implied minor to the implied_hist...
          relative = chord.root.interval("M6");
          implied_hist.add(get_flavored_key(relative, "m"));
        } else if (chord.quality() == "minor") {
          key_hist.add(get_flavored_key(chord, "m"));
          relative = chord.root.interval("m3");
          implied_hist.add(get_flavored_key(relative, "m"));
        } else if (chord.quality() == "diminished") {
          key_hist.add(get_flavored_key(chord, "dim"));
          relative = chord.root.interval("m3");
          implied_hist.add(get_flavored_key(relative, "dim"));

        }
      });

      return {
        direct: key_hist,
        implied: implied_hist
      };

    }



    return {
      weighted: get_hists(progression.chord_list),
      unweighted: get_hists(_.uniq(progression.chord_list))

    };

  },
  get_progression_breaks: get_progression_breaks,
  get_progression_candidate_chords: get_progression_candidate_chords,
  get_simple_key: get_simple_key,
  use_blues_grammar: function() {
    module.exports.reset();
    grammar.add_grammar("blues", "IV iv v V Vm | v V IV | I");
    grammar.add_grammar("minor blues", "iv IV v V Vm | v V IV | Im");
  },
  use_diatonic_grammar: function() {
    module.exports.reset();
    grammar.add_grammar("major", grammar.MAJOR_GRAMMAR);
    grammar.add_grammar("minor", grammar.MINOR_GRAMMAR);
  },
  use_custom_grammar: function(name, grammar_str) {
    module.exports.reset();
    grammar.add_grammar(name, grammar_str);
  },
  reset: function() {
    grammar.reset_grammars();

    try { SF.controller().trigger("reset_grammar"); } catch(e) { }
    cached_labelings = {};
    cached_harmoniousness = {};
  }
};


module.exports.use_diatonic_grammar();
