"use strict";

var analysis = require("app/client/analysis");
var grammar = require("app/client/grammar");
var Progression = require("app/client/progression");

function get_chord_names(intersected, mod_key) {
  if (intersected.length) {
    var intersected_with_names = [];
    _.each(intersected, function(chord) {
      if (analysis.get_chord_key(chord) === analysis.get_chord_key(mod_key)) {
        return;
      }

      intersected_with_names.push([chord, Progression.determine_function(chord,
        analysis.get_chord_key(mod_key))]);

    });

    if (!intersected_with_names.length) {
      return;
    }

    return intersected_with_names;
  }
}

function get_intersection(chord_key, current_key, mod_key) {

  var chords_in_key = _.uniq(grammar.CHORDS_IN_KEY[chord_key]);

  var chord_candidates = grammar.get_progression_candidates(chord_key, current_key);
  var chords_in_mod_key = grammar.CHORDS_IN_KEY[mod_key];
  var in_common = _.intersection(chords_in_mod_key, chords_in_key);

  var simple_mod_key = analysis.get_chord_key(mod_key);
  var new_chord_candidates  = grammar.get_progression_candidates(chord_key, simple_mod_key);
  var new_func = Progression.determine_function(chord_key, simple_mod_key);

  var candidate_chords = _.map(chord_candidates, function(c) {
    return Progression.get_chord_for_function(c, current_key);

  });
//      console.log("CANDIDATE CHORDS", current_key, chord_candidates, candidate_chords);
//      console.log("MOD CANDIDATE CHORDS", mod_key, new_chord_candidates, mod_candidate_chords);
//      console.log("FUNCS", current_key, mod_key, Progression.determine_function(mod_key, current_key));
//      console.log("CANDIDATE FUNCS", current_key, mod_key, chord_candidates, new_chord_candidates);
//      console.log("CANDIDATE CHORDS", current_key, mod_key, candidate_chords, mod_candidate_chords);
//
//      console.log("INTERSECTED", intersected);
//
//

  var mod_candidate_chords = _.map(new_chord_candidates, function(c) {
    return Progression.get_chord_for_function(c, mod_key);
  });
  var intersected = _.intersection(mod_candidate_chords, candidate_chords);

  return intersected;

}
var checked_keys = {};
function get_common_chord_modulations(progression) {
  var candidates = {};
  var relative_modulations = get_relative_modulations(progression);
  _.each(progression.chord_list, function(chord, index) {
    var current_key = progression.key;
    var current_func = progression.labeling[index];

    var possible_keys = [[current_key, current_func]];
    if (progression.modulations[index]) {
      possible_keys.push([progression.modulations[index] || progression.key, progression.mod_labeling[index]]);
    }

    _.each(possible_keys, function(key_info) {
      var current_key = key_info[0];
      var current_func = key_info[1];

      var checked_key = current_key + ":" + current_func;
      if (checked_keys[checked_key]){
        return;
      }

      checked_keys[checked_key] = true;


      var chord_key = analysis.get_flavored_key(chord);
      var relatives = relative_modulations[chord_key];
      relatives[chord_key] = 'original';

      _.each(relatives, function(reason, relative) {
        var chord_key = analysis.get_flavored_key(relative);
        var keys_with_chords = grammar.KEYS_WITH_CHORD[chord_key];
        _.each(keys_with_chords, function(index, mod_key) {
          if (analysis.get_chord_key(mod_key) === analysis.get_chord_key(current_key)) {
            return;
          }
          var intersected = get_intersection(chord_key, analysis.get_chord_key(chord_key), mod_key);
          var intersected_with_names = get_chord_names(intersected, mod_key);

          if (!candidates[current_key + "M"]) { candidates[current_key + "M"] = {}; }
          if (!candidates[current_key + "M"][mod_key]) { candidates[current_key + "M"][mod_key] = {}; }

          candidates[current_key + "M"][mod_key][chord_key] = intersected_with_names;


        });

      });

    });
  });

  return candidates;
}

function get_relative_modulations(progression) {
  var major = false;

  if (_.filter(progression.mod_labeling, function(p) { return p ===  "I"; }).length  <
      _.filter(progression.mod_labeling, function(p) { return p ===  "Im"; }).length) {
    major = true;
  }

  var candidates = {};
  var chord_set = _.uniq(progression.chord_list);
  _.each(chord_set, function(chord) {
    var chord_key = analysis.get_chord_key(chord);
    var chord_quality = "M";
    if (!analysis.chord_is_major(chord)) {
      chord_quality = "m";
    }

    candidates[chord_key + chord_quality] = {};
    if (chord.quality() == "major" || chord.quality() == "dominant") {
      candidates[chord_key + chord_quality][chord_key + "m"] = "p. min";
      var relative = teoria.note(chord_key).interval("M6");
      candidates[chord_key + chord_quality][relative.name() + relative.accidental() + "m"] = "r. min";

      if (chord.quality() == "dominant") {
        var implied_key = analysis.get_chord_key(teoria.note(chord_key).interval("P4").name());
        candidates[chord_key + chord_quality][implied_key + "M"] = "res 7";
      } else {
        var implied_key = analysis.get_chord_key(teoria.note(chord_key).interval("P4").name());
        candidates[chord_key + chord_quality][chord_key + "M7"] = "dom7";
        candidates[chord_key + chord_quality][implied_key + "M"] = "res7";

      }
    } else { // not major
      candidates[chord_key + chord_quality][chord_key + "M"] = "p. maj";
      var relative = teoria.note(chord_key).interval("m3");
      candidates[chord_key + chord_quality][relative.name() + relative.accidental() + "M"] = "r. maj";
    }
  });

  return candidates;
}

module.exports = {
    get_possible_variations: function(progression) {
      var common_chord_modulations = get_common_chord_modulations(progression);
      var relative_modulations = get_relative_modulations(progression);

      console.log("RELATIVE MODULATIONS", relative_modulations);

      // HERE WE GO...
      console.log("COMMON CHORD MODULATIONS", common_chord_modulations);

      return {
        relative: relative_modulations,
        common_chord: common_chord_modulations
      };

 
    }
};
