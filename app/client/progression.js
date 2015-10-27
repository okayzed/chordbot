
var major_progression = [ "I", "ii", "iii", "IV", "V", "vi", "vii" ];
var minor_progression = [ "Im", "ii", "III", "iv", "V", "VI", "vii" ];

var cached_determineds = {};

module.exports = {
  get_chord_for_function: function(func, root) {
    var acc = -1;
    var chord_name;
    var quality;
    bootloader.js(["app/client/grammar", "app/client/analysis"], function() {
      var grammar = bootloader.require("app/client/grammar");
      var analysis = bootloader.require("app/client/analysis");

      if (func.match(/m$/)) {
        quality = "m";
      }
      if (func.match(/M$/)) {
        quality = "M";
      }
      func = func.replace(/[mM]$/, "");



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

      var chord_key = analysis.get_flavored_key(root);
      var simple_key = analysis.get_chord_key(root);

      if (grammar.FUNCTIONS_FOR_KEY[chord_key]) {
        chord_name = grammar.FUNCTIONS_FOR_KEY[chord_key][func];
      }

      if (!chord_name) {
        chord_name = grammar.FUNCTIONS_FOR_KEY[simple_key][func];
      }

      if (chord_name) {
        chord_name = analysis.get_flavored_key(chord_name, quality);
      }

      // maybe we try one more time, but inverting values...
      if (!chord_name) {
        func = func.toUpperCase();
        chord_name = grammar.FUNCTIONS_FOR_KEY[chord_key][func];
        if (!chord_name) {
          chord_name = grammar.FUNCTIONS_FOR_KEY[simple_key][func];
        }

        if (chord_name) {
          chord_name = analysis.get_flavored_key(chord_name, quality || "m");
        }
      } 

      if (!chord_name) {
        func = func.toLowerCase();
        chord_name = grammar.FUNCTIONS_FOR_KEY[chord_key][func];
        if (!chord_name) {
          chord_name = grammar.FUNCTIONS_FOR_KEY[simple_key][func];
        }

        if (chord_name) {
          chord_name = analysis.get_flavored_key(chord_name, quality || "M");
        }

      }

    });

    // Need to release the accumulator...
    if (!acc) {
      return chord_name;
    }

    bootloader.js("app/client/analysis", function() {
      var analysis = bootloader.require("app/client/analysis");
      while (acc != 0) {
        var delta = 1;
        if (acc > 0) {
          delta = -1;
        }

        acc += delta;

        var chord = teoria.chord(chord_name);
        var chord_quality = quality || "M";
        if (chord.quality() == "minor") {
          chord_quality = "m";
        }

        if (delta > 0) {
          chord_name = analysis.get_chord_key(chord_name) + "b" + chord_quality;
        } else {
          chord_name = analysis.get_chord_key(chord_name) + "#" + chord_quality;
        }

      }


    });

    return chord_name;

    

  },
  determine_function: function(chord, root) {   
    if (!cached_determineds[root]) {
      cached_determineds[root] = {};

    }
    if (cached_determineds[root][chord]) {
      return cached_determineds[root][chord];
    }


    if (typeof(chord) === "string") {
      chord = window.teoria.chord(chord);
    }
    var chord_root = chord.simple()[0];
    var teoria = window.teoria;


    // this is one way, but probably not the right way. instead, get the scale
    // off the root in major and minor modes.
    var interval = teoria.Interval.between(teoria.note(root), teoria.note(chord_root));

    var value = interval.value();
    if (value < 0) {
      interval = interval.invert();
    }

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
      "diminished" : "dim",
      "minor" : "m",
      "augmented" : "+",
      "suspended" : "sus"
    };


    var small_quality = lookup[chord.quality()];
    var labeling = prog_name;
    if (small_quality !== desired_quality) {
      if (small_quality) {
        prog_name += small_quality;
      }
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

    cached_determineds[root][chord] = prog_name;

    return prog_name;



  },
  minor: minor_progression,
  major: major_progression
};
