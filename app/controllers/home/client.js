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
  "A D A D A D F G A Dm GM CM AM Dm G7 CM Dm E7",
  "Ebm Gbm C#M",
  "Ab Db Ab Db Fb Gb Ab"
];

var analysis = require("app/client/analysis");
var Progression = require("app/client/progression");
var normal = require("app/client/normal");
var generator = require("app/client/generator");

function get_chord_name(chord) {
  try {
    var chord_name = analysis.get_flavored_key(chord);
    return chord_name[0].toUpperCase() + chord_name.slice(1);
  } catch(e) {
    return chord;
  }

}


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
  },
  init: function() {
    // Do all the processing here...
    var self = this;
    var delay = 0;
    _.each(read_progressions, function(line) {
      setTimeout(function() {
        self.analyze_progression_str(line);
      }, delay);
      delay += 10;

    });
  },

  build_ui_for_progression: function(progression) {
    var self = this;
    var parentEl = $("<div />");
    parentEl.append("<hr />");
    var progressionEl = $("<div class='clearfix' />");
    _.each(progression.chord_list, function(chord, index) {

      var current_key = progression.modulations[index] || progression.key;
      var chordEl = $("<div class='col-xs-2 col-md-2'/>");
      chordEl.addClass("chord");

      progressionEl.append(chordEl);
      var current_key = progression.key;
      var mod_key = progression.modulations[index] || current_key;
      var chordLabel = $("<div 'function_label'/>");
      chordLabel.html(progression.labeling[index] + " <span class='rfloat'>" + current_key + "</span>");

      chordEl.text(get_chord_name(chord));
      chordEl.append(chordLabel);

      if (progression.mod_labeling[index] !== progression.labeling[index]) {
        var modLabel = $("<div class='mod_label'/>");
        modLabel.html(progression.mod_labeling[index] + " <span class='rfloat'>" + mod_key + "</span>");
        chordEl.append(modLabel);
      } else {
        chordEl.append("<div>&nbsp;</div>");
      }

      chordEl.hover(function() {
        self.build_popover(chordEl, progression, index);
        chordEl.popover('show');

      }, function() {
        chordEl.popover('hide');

      });


    });

    parentEl.append(progressionEl);

    return parentEl;
  },

  build_popover: function(chordEl, progression, index) {
    var has_popover = chordEl.data("has_popover");
    if (has_popover) {
      return;
    }

    var current_key = progression.key;
    var chord = progression.chord_list[index];
    var relative_modulations = progression.variations.relative;
    var common_chord_modulations = progression.variations.common_chord;

    // For any given chord, we find it's relative modulations...
    // and we find the modulations based on current key / destination key
    var relatives = relative_modulations[analysis.get_flavored_key(chord)];
    var available = [];
    _.each(common_chord_modulations[current_key], function(chords, dest_key) {
      var chord_key = analysis.get_flavored_key(chord);
      if (chords[chord_key]) {
        available.push([dest_key, get_chord_name(chord_key), chords[chord_key]]);
      }
    });

    var content = $("<div />");
    content.append("<h3>Relative modulations</h3>");
    _.each(relatives, function(reason, relative) {
      content.append( get_chord_name(relative) + "\t <span class='rfloat'>" + reason + "</span><br />\n" );
    });

    if (available.length) {
      content.append("<h3>Common Chord Modulations</h3>");

      _.each(available, function(relative) {
        content.append( relative[0].toUpperCase() + "\t" + relative[2] + "<br />\n");
      });
    }

    chordEl.popover({
      content: content.html(),
      html: true,
      placement: "bottom"

    });

  },



  build_table_of_modulations: function(progression, variations) {
    var parentEl = $("<div />");
    var common_chord_modulations = variations.common_chord;
    var relative_modulations = variations.relative;

    parentEl.append("<h2>Relative Modulations</h2>");
    var table = $("<div />");
    _.each(relative_modulations, function(relatives, mod_key) {
      var rowEl = $("<div class='clearfix row'/>");
      rowEl.append($("<div class='col-md-4' />").text(mod_key));
      _.each(relatives, function(relation, relative) {
        rowEl.append($("<div class='col-md-1 col-xs-2' />").text(relation));
        rowEl.append($("<div class='col-md-1 col-xs-2' />").text(relative));

      });
      table.append(rowEl);
    });
    parentEl.append(table);

    parentEl.append("<h2>Common Chord Modulations</h2>");
    table = $("<div />");
    _.each(common_chord_modulations, function(modulations, source) {
      _.each(modulations, function(chord_info, dest) {
        _.each(chord_info, function(relation, using) {
          var rowEl = $("<div class='clearfix row'/>");
          rowEl.append($("<div class='col-md-1' />").text(source + "->" + dest));
          rowEl.append($("<div class='col-md-2 col-xs-2' />").text("on chord: " + using));
          _.each(relation, function(rel) {
            rowEl.append($("<div class='col-md-1 col-xs-1' />").text(rel));
          });

          table.append(rowEl);

        });

      });
    });

    // Generate the UI...
    // We need seechords
    // We should have histos

    parentEl.append(table);
    return parentEl;

  },

  analyze_progression_str: function(line) {
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

    var prog = sorted_progressions[0];
    console.log("HARMONIOUSNESS", analysis.get_progression_harmoniousness(prog.mod_labeling), "BREAKS", analysis.check_progression_grammar(prog.mod_labeling));

    var self = this;
    if (!self.progressions) {
      self.progressions = {};
    }
    self.progressions[line] = prog;

    var uiEl = module.exports.build_ui_for_progression(prog);
    self.$el.find(".container").append(uiEl);

    console.log("FINDING MODULATION OPPORTUNITIES");
    prog.variations = generator.get_possible_variations(prog);

  },
  show_chord_progression: function(id) {
    this.$el.find(".tab-pane").hide();
    this.$el.find(id).show();
  },
  handle_nav_click: function(e) {
    this.show_chord_progression($(e.target).closest("a").attr('href'));
  },
  events: {
    "click a.nav" : "handle_nav_click"
  }


};
