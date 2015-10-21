"use strict";

module.exports = {
  get_normal_chord: function(chord, current_key) {
    // TODO: fill this out to normalize # into flat keys
    if (chord.length > 1) {
      chord = chord.replace(/d$/, "dim").replace(/D$/, "7");
    }
    return chord;
  },
  normalize_chord_list: function(chord_list, root) {
    _.each(chord_list, function(chord, index) {
      chord_list[index] = module.exports.get_normal_chord(chord);
    });
  }
};
