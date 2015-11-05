"use strict";

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

module.exports = {
  get_normal_chord: function(chord, current_key) {
    // TODO: fill this out to normalize # into flat keys
    if (chord.length > 1) {
      if (chord.indexOf("/") != -1) {
        var chords = chord.split("/");
        chord = chords[0];
        if (chord.length > 1) {
          chord = chord.replace(/d$/, "dim").replace(/D$/, "dom");
        }
        chord = chord + "/" + chords[1];
        return chord;
      }
      chord = chord.replace(/d$/, "dim").replace(/D$/, "dom");
    }
    return chord;
  },
  chord_is_major: function(chord_ish) {
    var name = get_flavored_key(chord_ish);
    if (name.match("M") || name.match(DOM_SUFFIX)) {
      return true;
    }
  },
  normalize_chord_list: function(chord_list, root) {
    _.each(chord_list, function(chord, index) {
      chord_list[index] = module.exports.get_normal_chord(chord);
    });
  },
  get_chord_key: function(chord_ish) {
    if (typeof(chord_ish) === "string") {
      chord_ish = teoria.chord(chord_ish);
    }

    return chord_ish.root.name() + chord_ish.root.accidental();
  },
  get_flavored_key: get_flavored_key,
  get_simple_key: get_simple_key,
};
