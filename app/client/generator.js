var analysis = require("app/client/analysis");

function get_common_chord_modulations(progression) {

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
      var histograms = analysis.get_chord_histograms(progression);
      var common_chord_modulations = get_common_chord_modulations(progression);
      var relative_modulations = get_relative_modulations(progression);

      console.log("WEIGHTED HISTOGRAM", histograms.weighted);
      console.log("UNWEIGHTED ", histograms.unweighted);

      console.log("RELATIVE MODULATIONS", relative_modulations);
      console.log("COMMON CHORD MODULATIONS", common_chord_modulations);

    }
};
