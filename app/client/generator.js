"use strict";

var analysis = require("app/client/analysis");
var normal = require("app/client/normal");
var grammar = require("app/client/grammar");
var Progression = require("app/client/progression");

function get_chord_names(intersected, mod_key) {
  if (intersected.length) {
    var intersected_with_names = [];
    _.each(intersected, function(chord) {
      if (normal.get_chord_key(chord) === normal.get_chord_key(mod_key)) {
        return;
      }

      intersected_with_names.push([chord, Progression.determine_function(chord,
        normal.get_chord_key(mod_key))]);

    });

    return intersected_with_names;
  }
}

var cached_intersections = {};
function get_intersection(chord_key, current_key, mod_key) {
  var cache_key = chord_key + ":" + current_key + ":" + mod_key;
  if (cached_intersections[cache_key]) {
    return cached_intersections[cache_key];
  }


  var candidate_chords = analysis.get_progression_candidate_chords(chord_key, current_key);
  var mod_candidate_chords  = analysis.get_progression_candidate_chords(chord_key, mod_key);

  var intersected = {};
  var candidates = [];
  _.each(mod_candidate_chords, function(mc) {
    if (!mc) {
      return;
    }
    intersected[normal.get_simple_key(mc)] = mc;
  });

  _.each(candidate_chords, function(c) {
    if (!c) {
      return;
    }
    if (intersected[normal.get_simple_key(c)]) {
      candidates.push(c);
      candidates.push(intersected[normal.get_simple_key(c)]);
    }

  });

  intersected = _.uniq(candidates);

  cached_intersections[cache_key] = intersected;
  return intersected;

}

function get_common_chord_modulations(progression) {
  var candidates = {};
  var checked_keys = progression.checked_keys || {};
  progression.checked_keys = {};

  console.log("RELATIVE MODULATIONS", relative_modulations);

  var relative_modulations = progression.variations.relative;
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


      var chord_key = normal.get_flavored_key(chord);
      var relatives = relative_modulations[chord_key];
      if (!relatives) {
        var simple_key = normal.get_chord_key(chord) + "M";
        relatives = relative_modulations[simple_key];
      } else {
        relatives[chord_key] = 'original';
      }

      _.each(relatives, function(reason, relative) {
        var flavored_key = normal.get_flavored_key(relative);
        var chord_key = normal.get_simple_key(relative);

        var keys_with_chords = grammar.KEYS_WITH_CHORD[chord_key];
        var other_keys_with_chords = grammar.KEYS_WITH_CHORD[flavored_key];
        if (!keys_with_chords) {
          keys_with_chords = other_keys_with_chords;
        } else {
          keys_with_chords = _.extend(keys_with_chords, other_keys_with_chords);
        }


        _.each(keys_with_chords, function(index, mod_key) {
          var intersected = get_intersection(chord_key, normal.get_chord_key(current_key), mod_key);
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
    var chord_key = normal.get_chord_key(chord);
    var chord_quality = "M";
    if (!normal.chord_is_major(chord)) {
      chord_quality = "m";
    }

    candidates[chord_key + chord_quality] = {};
    if (normal.chord_is_major(chord)) {
      candidates[chord_key + chord_quality][chord_key + "m"] = "p. min";
      var relative = teoria.note(chord_key).interval("M6");
      candidates[chord_key + chord_quality][relative.name() + relative.accidental() + "m"] = "r. min";

      if (chord.quality() == "dominant") {
        var implied_key = normal.get_chord_key(teoria.note(chord_key).interval("P4").name());
        candidates[chord_key + chord_quality][chord_key + "7"] = "original";
        candidates[chord_key + chord_quality][implied_key + "M"] = "res 7";
      } else {
        var implied_key = normal.get_chord_key(teoria.note(chord_key).interval("P4").name());
        candidates[chord_key + chord_quality][chord_key + "7"] = "dom7";
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
    get_intersection: get_intersection,
    get_possible_variations: function(progression) {
      var relative_modulations = get_relative_modulations(progression);
      progression.variations = { relative:  relative_modulations };

      var common_chord_modulations = get_common_chord_modulations(progression);

      console.log("RELATIVE MODULATIONS", relative_modulations);

      // HERE WE GO...
      console.log("COMMON CHORD MODULATIONS", common_chord_modulations);

      return {
        relative: relative_modulations,
        common_chord: common_chord_modulations
      };

 
    }
};
