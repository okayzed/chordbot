// LAYOUT OF THE PROGRAM
// analysis
// generator
// grammar
//  check grammar
//  generate candidate
// normalize
// printer
// driver
//
// from mingus:
// progressions.determine - need to implement
'use strict';

require("app/static/vendor/teoria");

var read_progressions = [ 
  "Em GM Em GM", 
  "A D A D A D F G A Dm GM CM AM Dm G7 CM Dm E7"
];

var analysis = require("app/client/analysis");
var Progression = require("app/client/progression");
var normal = require("app/client/normal");
var generator = require("app/client/generator");


function get_chords_from_str(str) {

  var teoria = window.teoria;
  var chord_list = [];
  _.each(str.split(" "), function(token) {
    var chord = teoria.chord(token);
    chord_list.push(chord);
  });
  return  chord_list;
}


module.exports = {
  click_handler_uno: function() {
    console.log("Handling a click");
  }, 
  init: function() {
    console.log("Created controller");

    // Do all the processing here... 
    _.each(read_progressions, function(line) {
      var chord_list = get_chords_from_str(line);
      console.log("READING LINE", line);

      // We instantiate a progression class that should do what...?
      var likely_progressions = analysis.guess_progression_labelings(chord_list);

      var progressions = [];

      _.each(likely_progressions, function(labeling, key) {
        var progression = {};
        progression.key = key;
        progression.labeling = labeling;
        progression.chord_list = chord_list;

        normal.normalize_chord_list(chord_list, labeling, key);
        var modulations = analysis.get_possible_modulations(progression);
        progression.modulations = modulations;

        progression.mod_labeling = _.clone(progression.labeling);
        progression.applied_modulations = {};
        _.each(modulations, function(new_key, i) {
          var new_func = Progression.determine_function(chord_list[i], new_key);
          progression.applied_modulations[i] = new_func;
          progression.mod_labeling[i] = new_func;
        });

        progressions.push(progression);

      });

      var sorted_progressions = _.sortBy(progressions, function(p) {
        p.likeliness = analysis.decide_progression_likeliness(p.labeling);
        p.mod_likeliness = analysis.decide_progression_likeliness(p.mod_labeling);
        return -p.mod_likeliness;
      });

      console.log(sorted_progressions);
      var prog = sorted_progressions[0];
      console.log("HARMONIOUSNESS", analysis.get_progression_harmoniousness(prog.mod_labeling), "BREAKS", analysis.check_progression_grammar(prog.mod_labeling));

      console.log("FINDING MODULATION OPPORTUNITIES");
      generator.get_possible_variations(prog);


    });
  }
};
