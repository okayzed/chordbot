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
//  "A D A D A D F G A Dm GM CM AM Dm G7 CM Dm E7",
//  "Ebm Gbm C#M",
//  "Ab Db Ab Db Fb Gb Ab"
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
  }, 
  init: function() {
    // Do all the processing here... 
    var self = this;
    _.each(read_progressions, function(line) {
      self.analyze_progression_str(line);

    });
  },

  build_ui_for_progression: function(progression, modulations) {
    var relative_modulations = modulations.relative;
    var common_chord_modulations = modulations.common_chord;

    var parentEl = $("<div />");
    parentEl.append("<h1>CHORD PROGRESSION</h1>");
    parentEl.append($("<div></div>").text(progression.chord_list.join(" ")));
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

    console.log(sorted_progressions);
    var prog = sorted_progressions[0];
    console.log("HARMONIOUSNESS", analysis.get_progression_harmoniousness(prog.mod_labeling), "BREAKS", analysis.check_progression_grammar(prog.mod_labeling));

    console.log("FINDING MODULATION OPPORTUNITIES");
    var modulations = generator.get_possible_variations(prog);

    var uiEl = module.exports.build_ui_for_progression(prog, modulations);

    var self = this;

    // Now we gotta make the tabbed areas...
    var progId = "Prog" + $(".tab-nav li").length;
    var tabEl = uiEl;
    tabEl.addClass("tab-pane");
    tabEl.attr("id", progId);
    var tabNavElA = $("<a class='pal nav' />");
    var tabNavEl = $("<li />");
    tabNavElA.attr('href', '#' + progId);
    tabNavElA.html(progId);
    tabNavEl.append(tabNavElA);

    tabNavElA.data("toggle", "tab");
    self.$el.find(".container .tab-nav").append(tabNavEl);
    self.$el.find(".container .tab-content").append(tabEl);
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
