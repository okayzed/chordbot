
var major_progression = [ "I", "ii", "iii", "IV", "V", "vi", "vii" ];
module.exports = {
  determine_function: function(chord, root) {
    if (typeof(chord) === "string") {
      console.log("CHORD", chord);
      chord = window.teoria.chord(chord);
    }
    var chord_root = chord.simple()[0];
    var teoria = window.teoria;


    // this is one way, but probably not the right way. instead, get the scale
    // off the root in major and minor modes.
    var interval = teoria.Interval.between(teoria.note(chord_root), teoria.note(root));

    var progression_type = major_progression;
    var prog_name = progression_type[(interval.number() - 1) % 7];
    var desired_quality = prog_name.toUpperCase() === prog_name;
    if (desired_quality) {
      desired_quality = "M";
    } else {
      desired_quality = "m";
    }


    // Look up for names to their symbols...
    var lookup = {
      "major" : "M",
      "dominant" : "7",
      "minor" : "m"
    };


    var small_quality = lookup[chord.quality()];
    var labeling = prog_name;
    if (small_quality !== desired_quality) {
      prog_name += small_quality;
    }

    if (interval.quality() == "m") {
      prog_name = "b" + prog_name;
    }
    if (interval.quality() == "A") {
      prog_name = "#" + prog_name;
    }
    if (interval.quality() == "d") {
      prog_name = "bb" + prog_name;
    }

    return prog_name;



  }
};
