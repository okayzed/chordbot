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
//  "Em GM Em GM",
  "A D A D A D F G A Dm GM CM AM Dm G7 CM Dm E7",
//  "Ebm Gbm C#M",
// "G Em G Em G Bm Am D G Em Bm G G D G Bm C D G C G Bm Am D G Em Bm Em G F D",
//  "Ab Db Ab Db Fb Gb Ab"
];

var analysis = require("app/client/analysis");
var Progression = require("app/client/progression");
var normal = require("app/client/normal");
var generator = require("app/client/generator");

var BARS_PER_LINE = 8;

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

  build_histogram_for_progression: function(progression) {
    var histograms = analysis.get_chord_histograms(progression);
    console.log("WEIGHTED HISTOGRAM", histograms.weighted);
    console.log("UNWEIGHTED ", histograms.unweighted);

    var parentEl = $("<div />");
    var canseeEl = $("<div />");
    var overallEl = $("<div />");

    overallEl.append(parentEl).append(canseeEl);

    var printed_keys = {};

    var seen_chords = _.keys(histograms.unweighted.direct);
    var seen_modulations = {};
    var variations = progression.variations;

    var possible_keys = {};
    _.each(progression.variations.common_chord, function(mod_keys) {
      _.each(mod_keys, function(using, mod_key) {
        possible_keys[mod_key] = 1;
      });
    });

    _.each(progression.variations.relative, function(mod_keys) {
      _.each(mod_keys, function(reason, mod_key) {
        possible_keys[mod_key] = 1;
      });
    });


    _.each(possible_keys, function(discard, key) {
      var rowEl = $("<div class='clearfix' />");
      rowEl.addClass("hist_row");
      rowEl.addClass("key_" + get_chord_name(key));

      if ($(".key_" + get_chord_name(key)).length) {
        return;
      }
    
      var progression = Progression.major;
      if (!analysis.chord_is_major(key)) {
        progression = Progression.minor;

      }

      if (printed_keys[get_chord_name(key)]) {
        return;
      }

      printed_keys[get_chord_name(key)] = true;

      var seen_key = false;
      var implied_key = false;
      var mapped = _.map(progression, function(func, index) {
        var chord = Progression.get_chord_for_function(func, key);

        var el = $("<div class='col-md-1 col-xs-1 hist_key'/>");
        el.addClass("func_" + func);
        el.addClass("chord_" + get_chord_name(chord));
        var seen = histograms.unweighted.direct.raw[chord];
        var implied = histograms.unweighted.implied.raw[chord];
        if (func == "I" || func == "Im") {
          if (seen) { seen_key = true; }
          if (implied) { implied_key = true; }
        }
        
        if (implied) {
          el.css("border-bottom", "2px dotted gray");

        }

        if (seen) {
          el.css("border", "2px solid gray");
        } 

        el.html(get_chord_name(chord));

        return el;
      });

      rowEl.append(mapped);
      if (seen_key) {
        parentEl.append(rowEl);
      } else if (implied_key) {
        canseeEl.prepend(rowEl);
      } else {
        canseeEl.append(rowEl);

      }

    });

    return overallEl;


  },

  build_ui_for_progression: function(progression) {
    var self = this;
    var parentEl = $("<div />");
    parentEl.append("<hr />");
    var progressionEl = $("<div class='clearfix' />");
    _.each(progression.chord_list, function(chord, index) {
      if (index && index % BARS_PER_LINE == 0) {
        parentEl.append(progressionEl);
        progressionEl = $("<div class='clearfix' />");

      }

      var current_key = progression.modulations[index] || progression.key;
      var chordEl = $("<div class='col-xs-1 col-md-1'/>");
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
//        chordEl.popover('show');

        $(".hist_row").removeClass("active relative current common");
        $(".hist_key").removeClass("active relative current common");

        module.exports.highlight_cells(progression, index);

      }, function() {
//        chordEl.popover('hide');
        $(".hist_row").removeClass("active relative current common");
        $(".hist_key").removeClass("active relative current common");

      });


    });

    parentEl.append(progressionEl);

    return parentEl;
  },

  highlight_cells: function(progression, index) {
    var current_key = progression.key;
    var chord = progression.chord_list[index];
    var relative_modulations = progression.variations.relative;
    var common_chord_modulations = progression.variations.common_chord;

    // For any given chord, we find it's relative modulations...
    // and we find the modulations based on current key / destination key
    var relatives = relative_modulations[analysis.get_flavored_key(chord)];
    var available = [
      [chord, "", []]
    ];
    _.each(common_chord_modulations[current_key + "M"], function(chords, dest_key) {
      var chord_key = analysis.get_flavored_key(chord);
      if (chords[chord_key]) {
        available.push([dest_key, get_chord_name(chord_key), chords[chord_key]]);
      }
    });

    _.each(relatives, function(reason, relative) {
      $(".chord_" + get_chord_name(relative)).addClass("relative");
    });

    $(".chord_" + get_chord_name(chord)).addClass("current");
    $(".key_" + get_chord_name(chord)).addClass("current");

    console.log("HOVER ON", progression.chord_list[index]);
    console.log("RELATIVES", relatives);
    console.log("ACTIVE", available);

    if (available.length) {
      _.each(available, function(relative) {
        console.log("MAKING ACTIVE", relative, relative[0]);
        var keyEl = $(".key_" + get_chord_name(relative[0]));
        keyEl.addClass("active");

        // Common chords between relative key and the current key...
        _.each(relative[2], function(chord) {
          keyEl.find(".chord_" + get_chord_name(chord)).addClass("common");
        });
      });
    }


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
    _.each(common_chord_modulations[current_key + "M"], function(chords, dest_key) {
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
      placement: "top"

    });

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
      progressions.push(progression);
    });

    progressions  = _.sortBy(progressions, function(p) {
      p.likeliness = analysis.decide_progression_likeliness(p.labeling.slice(0, 4));
      return -p.likeliness;
    });
    progressions = progressions.slice(0, 5);

    _.each(progressions, function(progression) {

      var modulations = analysis.get_possible_modulations(progression);
      progression.modulations = modulations;

      progression.mod_labeling = _.clone(progression.labeling);
      progression.applied_modulations = {};
      _.each(modulations, function(new_key, i) {
        var new_func = Progression.determine_function(chord_list[i], new_key);
        progression.applied_modulations[i] = new_func;
        progression.mod_labeling[i] = new_func;
      });


    });

    var sorted_progressions = _.sortBy(progressions, function(p) {
      console.log("KEY", p.key, "HARMONIOUSNESS", analysis.get_progression_harmoniousness(p.mod_labeling), "BREAKS", analysis.check_progression_grammar(p.mod_labeling));
      p.likeliness = analysis.decide_progression_likeliness(p.labeling);
      p.mod_likeliness = analysis.decide_progression_likeliness(p.mod_labeling);

      var front_likely = analysis.decide_progression_likeliness(p.labeling.slice(0, 4));
      return -front_likely;
    });

    console.log(progressions);

    var prog = sorted_progressions[0];
    console.log("HARMONIOUSNESS", analysis.get_progression_harmoniousness(prog.mod_labeling), "BREAKS", analysis.check_progression_grammar(prog.mod_labeling));

    var self = this;
    if (!self.progressions) {
      self.progressions = {};
    }
    self.progressions[line] = prog;

    var uiEl = module.exports.build_ui_for_progression(prog);
    self.$el.find(".progression").append(uiEl);

    console.log("FINDING MODULATION OPPORTUNITIES");
    prog.variations = generator.get_possible_variations(prog);

    var histEl = module.exports.build_histogram_for_progression(prog);
    self.$el.find(".histogram").append(histEl);


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
