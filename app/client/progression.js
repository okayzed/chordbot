
var major_progression = [ "I", "ii", "iii", "IV", "V", "vi", "vii" ];
module.exports = {
  get_chord_for_function: function(func, root) {
    var acc = -1;
    var chord_name = "???";
    bootloader.js(["app/client/grammar", "app/client/analysis"], function() {
      var grammar = bootloader.require("app/client/grammar");
      var analysis = bootloader.require("app/client/analysis");

      acc = 0;
      while (func.match(/b/)) {
        func = func.replace(/b/, '');
        acc--;
      }
      while (func.match(/#/)) {
        func = func.replace(/#/, '');
        acc++;
      }

      // now we expect it to be in form [vViI]7?
      var match = func.match(/[VviI]+7?/);
      if (match.indexOf("7") !== -1) {
        // its a 7th chord!
        func.replace("7", "");
      }

      var chord_key = analysis.get_chord_key(root);

      chord_name = grammar.FUNCTIONS_FOR_KEY[chord_key][func];


    });

    return chord_name;

    

  },
  determine_function: function(chord, root) {
    if (typeof(chord) === "string") {
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
