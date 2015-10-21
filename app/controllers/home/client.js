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

var analysis = require("app/client/analysis");
var Progression = require("app/client/progression");
var normal = require("app/client/normal");
var generator = require("app/client/generator");

var BARS_PER_LINE = 8;
var LAST_SELECTED_INDEX;

var SELECTED_KEY;
var SELECTED_PROGRESSION;
var SELECTED_CHORD;
var SELECTED_CHORD_INDEX;

function clean_line(line) {
  var lines = _.filter(line.replace(/\s\s/g, " ").split(), function(l) { return l; });
  return lines.join(" ");
}

function get_chord_classname(chord) {
  return analysis.get_simple_key(chord).replace("#", "s");
}

function get_chord_name(chord) {
  try {
    var chord_name = analysis.get_flavored_key(chord);
    chord_name = chord_name[0].toUpperCase() + chord_name.slice(1);
    return chord_name.replace("dom", "D").replace("dim", "d");
  } catch(e) {
    return chord;
  }

}


function get_chords_from_str(str) {

  var teoria = window.teoria;
  var chord_list = [];
  _.each(str.replace(/\s/g, " ").split(" "), function(token) {
    try {

      token = normal.get_normal_chord(token);
      var chord = teoria.chord(token.trim().replace(/\s/, ""));
      chord_list.push(chord);
    } catch (e) {
      console.log("ERROR", token, e);

    }
  });
  return  chord_list;
}


var OPENED = false;
function wipe_els(els) {
  els.removeClass("active relative current common possible");
}

module.exports = {
  click_handler_uno: function() {
  },
  init: function() {
    var self = this;
    self.on("reset_grammar", function() {
      console.log("RESETTING OLD GRAMMAR");
      module.exports.old_val = false;
      self.analyze_chords();
    });

  },

  toggle_histogram: function() {
    var line = clean_line($("textarea").val());

    var progression = SELECTED_PROGRESSION;

    if (OPENED == SELECTED_CHORD) {
      wipe_els($(".hist_row, .hist_key"));
      module.exports.close_histogram();
    } else {
      OPENED = SELECTED_CHORD;
      module.exports.open_histogram(progression);
    }


  },

  open_histogram: function(progression) {
    
    var closehistEl = $(".close_hist");
    closehistEl.html("<span class='' />close</span>");

    wipe_els($(".hist_row, .hist_key"));
    module.exports.highlight_cells(progression, SELECTED_CHORD_INDEX);

  },
  close_histogram: function() {
    OPENED = false;
    var closehistEl = $(".close_hist");
    closehistEl.html("<span class=''>mods</span>");
  },

  build_histogram_for_progression: function(progression) {
    var histograms = analysis.get_chord_histograms(progression);
    console.log("WEIGHTED HISTOGRAM", histograms.weighted);
    console.log("UNWEIGHTED ", histograms.unweighted);


    var parentEl = $("<div />");
    var overallEl = $("<div />");

    if (!$(".hist_head").length) {
      // get the hist out of the way
      var closehistEl = $("<a href='#' class='rfloat close_hist' style='20px; cursor: pointer; text-decoration: underline; color: #ddd;' />");
      closehistEl.on('click', function(e) {
        module.exports.toggle_histogram();
        e.preventDefault();
      });
      overallEl.append(closehistEl);
      // the header for the progression is

      parentEl.append("<div class='hist_head hist_key class_5 arrow_box'>iii</div>");
      parentEl.append("<div class='hist_head hist_key class_4 arrow_box'>vi</div>");
      parentEl.append("<div class='hist_head hist_key class_3'>IV</div>");
      parentEl.append("<div class='hist_head hist_key class_3 arrow_box'>ii</div>");
      parentEl.append("<div class='hist_head hist_key class_2'>V</div>");
      parentEl.append("<div class='hist_head hist_key class_2 arrow_box'>vii</div>");
      parentEl.append("<div class='hist_head hist_key class_1'>I</div>");
      parentEl.append("<div class='col-md-12 col-xs-12 clearfix' >&nbsp;</div>");
    }

    overallEl.append(parentEl);

    var printed_keys = {};

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
      rowEl.addClass("key_" + get_chord_classname(key));
      key = analysis.get_simple_key(key);

      if ($(".key_" + get_chord_classname(key)).length) {
        return;
      }

      var funcession = [ "I", "vii", "V", "ii", "IV", "vi", "iii" ];
      if (!analysis.chord_is_major(key)) {
        funcession =   [ "Im", "vii", "V", "ii", "iv", "VI", "III" ];
      }
      funcession.reverse();

      if (printed_keys[get_chord_name(key)]) {
        return;
      }


      printed_keys[get_chord_name(key)] = true;

      var seen_key = false;
      var implied_key = false;
      var mapped = _.map(funcession, function(func, index) {
        var chord = Progression.get_chord_for_function(func, key);
        var el = $("<div class='hist_key'/>");
        el.addClass("func_" + func);
        el.addClass("chord_" + get_chord_classname(chord));
        var seen = histograms.unweighted.direct.raw[chord];
        var implied = histograms.unweighted.implied.raw[chord];
        if (func == "I" || func == "Im") {
          if (seen) { seen_key = true; }
          if (implied) { implied_key = true; }
        }

        if (implied) {
          el.addClass("implied");
        }

        if (seen) {
          el.addClass("seen");
        }

        el.html(get_chord_name(chord));

        return el;
      });

      rowEl.append(mapped);
      if (get_chord_name(progression.key) === get_chord_name(key)) {
        rowEl.addClass("active");
        rowEl.addClass("perm");
        parentEl.prepend(rowEl);
      } else {
        parentEl.append(rowEl);
      }
    });

    return overallEl;


  },

  set_controls_for_progression: function(progression, progressions) {
    var controlsEl = $(".progression_info");
    controlsEl.removeClass("hidden");
    var keySelect = controlsEl.find(".key_selector");
    keySelect.empty();

    _.each(progressions, function(prog) {
      var optionEl = $("<option > </option>");
      var chord_key = get_chord_name(prog.key);
      chord_key = chord_key.slice(0, chord_key.length - 1);

      optionEl.html(chord_key);
      optionEl.attr('value', prog.key);

      if (progression.key === prog.key) {
        optionEl.attr('selected', true);
      }
      keySelect.append(optionEl);
    });

    var breaks = analysis.check_progression_grammar(progression.labeling);
    var mod_breaks = analysis.check_progression_grammar(progression.mod_labeling);

    var likeliness_ratio = parseInt(progression.likeliness / progression.chord_list.length * 100, 10);
    // likeliness is between 200 and -200 or something
    var likeEl = controlsEl.find(".likeliness_ratio");
    likeEl.css("line-height", "2em");
    if (likeliness_ratio > 150) {
      likeEl.css("border", "5px solid #15d115");
      likeEl.html("great fit");

    } else if (likeliness_ratio > 100) {
      likeEl.css("border-bottom", "5px solid #73d216");
      likeEl.html("good fit");
    } else if (likeliness_ratio > 80) {
        likeEl.css("border-bottom", "5px solid #73d216");
        likeEl.html("fit");
    } else if (likeliness_ratio > 60) {
        likeEl.css("border-bottom", "5px solid #edd400");
        likeEl.html("maybe fit?");
    } else if (likeliness_ratio > 40) {
      likeEl.css("border-bottom", "5px solid #f57900");
      likeEl.html("uhhh...");
    } else if (likeliness_ratio > 0) {
      likeEl.css("border-bottom", "5px solid #f50000");
      likeEl.html("pretty unlikely");
    } else if (likeliness_ratio > -50) {
      likeEl.css("border-bottom", "5px solid #000");
      likeEl.html("no way");

    }

    controlsEl.find(".harmoniousness").html(progression.likeliness);
    controlsEl.find(".mod_harmoniousness").html("NA");
    controlsEl.find(".mod_grammar_breaks").html("NA");
    controlsEl.find(".alternate_key").html("NA");
    console.log("LIKELINESS RATIO", likeliness_ratio);
    if (progression.mod_likeliness !== progression.likeliness) {
      controlsEl.find(".mod_harmoniousness").html(progression.mod_likeliness);
      controlsEl.find(".mod_grammar_breaks").html(mod_breaks);
      controlsEl.find(".alternate_key").html(_.uniq(_.values(progression.modulations)));
    }

    controlsEl.find(".grammar_breaks").html(breaks);
    controlsEl.find(".current_key").html(progression.key);


  },

  build_ui_for_progression: function(progression) {
    var self = this;
    var parentEl = $("<div />");
    parentEl.append("<hr />");
    var progressionEl = $("<div class='clearfix' />");
    var grammar_breaks = analysis.get_progression_breaks(progression.labeling);
    _.each(progression.chord_list, function(chord, index) {
      if (index && index % BARS_PER_LINE == 0) {
        parentEl.append(progressionEl);
        progressionEl = $("<div class='clearfix' />");

      }

      var current_key = progression.modulations[index] || progression.key;
      var chordEl = $("<div class='lfloat col-md-3 col-xs-6' />");
      chordEl.addClass("chord");

      if (grammar_breaks[index]) {
        if (grammar_breaks[index] == "miss") {
          chordEl.addClass("miss");
        } else {
          chordEl.addClass("break");

        }
      }

      progressionEl.append(chordEl);
      var current_key = progression.key;
      var mod_key = progression.modulations[index] || current_key;
      var chordLabel = $("<div class='function_label rfloat'/>");
      chordLabel.html(progression.labeling[index] + "<br /> <span class=''>" + get_chord_name(current_key) + "</span>");

      chordEl.text(progression.chord_list[index] + " (" + get_chord_name(progression.chord_list[index]) + ")");
      chordEl.append($("<div class='clearfix'/>"));
      chordEl.append(chordLabel);

      if (progression.mod_labeling[index] !== progression.labeling[index]) {
        var modLabel = $("<div class='mod_label'/>");
        modLabel.html(progression.mod_labeling[index] + "<br /> <span class=''>" + mod_key.toUpperCase() + "</span>");
        chordEl.append(modLabel);
      } else {
        chordEl.append("<div>&nbsp;</div>");
      }

      var open = false;
      chordEl.hover(function() {
        $(".chord_hover").removeClass("chord_hover");
        var chordEls = $(".chord_" + get_chord_classname(chord)).addClass("chord_hover");
      }, function() { });

      chordEl.click(function() {
        $(".hover").removeClass("hover");
        $(this).addClass("hover");
        var closehistEl = $(".close_hist");
        closehistEl.html("<span>mods</span>");

        if (get_chord_name(SELECTED_CHORD) !== get_chord_name(chord)) {
          closehistEl.fadeOut(function() {
            closehistEl.fadeIn();
          });
        }

        SELECTED_CHORD = progression.chord_list[index];
        SELECTED_CHORD_INDEX = index;
        bootloader.require("app/client/synth", function(synth) {
          synth.play_chord(analysis.get_flavored_key(progression.chord_list[index]));
        });
      });


    });

    parentEl.append(progressionEl);

    return parentEl;
  },

  highlight_cells: function(progression, index) {
    LAST_SELECTED_INDEX = index + 1;
    var current_key = progression.modulations[index] || progression.key;
    var chord = progression.chord_list[index];
    var relative_modulations = progression.variations.relative;
    var common_chord_modulations = progression.variations.common_chord;

    var hist_key = $(".key_" + get_chord_classname(current_key));
    var hist_key_parent = hist_key.parent();
    hist_key.addClass("current");

    hist_key.remove().prependTo(hist_key_parent);
    hist_key = $(".key_" + get_chord_classname(progression.key));

    hist_key_parent = hist_key.parent();
    hist_key.addClass("current");
    hist_key.remove().prependTo(hist_key_parent);

    // For any given chord, we find it's relative modulations...
    // and we find the modulations based on current key / destination key
    var relatives = relative_modulations[analysis.get_simple_key(chord)];

    // For available...
    var available = [
      [progression.key, "", []],
      [progression.modulations[index] || progression.key, "", []],
      [chord, "", []]
    ];

    _.each(common_chord_modulations[current_key + "M"], function(chords, dest_key) {
      var chord_key = analysis.get_simple_key(chord);
      if (chords[chord_key]) {
        available.push([dest_key, get_chord_name(chord_key), chords[chord_key]]);
      }
    });

    _.each(relatives, function(reason, relative) {
      var chordEl = $(".chord_" + get_chord_classname(relative));
      chordEl.addClass("relative");
    });

    var chord_key = analysis.get_simple_key(chord);
    var keys_with_chord = bootloader.require("app/client/grammar").KEYS_WITH_CHORD[chord_key];
    _.each(keys_with_chord, function(interval, dest_key) {
        available.push([analysis.get_flavored_key(dest_key), chord_key, []]);
    });

    $(".chord_" + get_chord_classname(chord)).addClass("current");

    var rows = [];

    if (available.length) {
      _.each(available, function(relative) {
        var keyEl = $(".key_" + get_chord_classname(relative[0]));
        keyEl.addClass("active");
        var currentChordEl = keyEl.find(".chord_" + get_chord_classname(chord));
        rows.push([keyEl, keyEl.find(".hist_key").index(currentChordEl)]);

        // Common chords between relative key and the current key...
        _.each(relative[2], function(chord) {
          $(".chord_" + get_chord_classname(chord[0])).addClass("common");
          keyEl.find(".chord_" + get_chord_classname(chord[0])).addClass("possible");
        });
      });
    }

    var sorted_rows = _.sortBy(rows, function(row) {
      return -row[1];
      
    });

    var prepEl = function(el) {
      var parent = el.parent();
      parent.prepend(el);
    };

    _.each(sorted_rows, function(row_info) {
      prepEl(row_info[0]);
    });

    var keyEl = $(".key_" + get_chord_classname(current_key));
    prepEl(keyEl);
    keyEl = $(".key_" + get_chord_classname(progression.modulations[index] || progression.key));
    prepEl(keyEl);

  },

  analyze_progression_str: function(line) {
    line = clean_line(line);
    var chord_list = get_chords_from_str(line);

    // We instantiate a progression class that should do what...?
    var likely_progressions = analysis.guess_progression_labelings(chord_list);
    var progressions = [];
    _.each(likely_progressions, function(labeling, key) {
      var progression = {};
      progression.key = key;
      progression.labeling = labeling;
      progression.chord_list = chord_list;


      progressions.push(progression);
    });

    progressions  = _.sortBy(progressions, function(p) {
      p.likeliness = analysis.decide_progression_likeliness(p.labeling.slice(0, 8));
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

    var prog = sorted_progressions[0];
    console.log("HARMONIOUSNESS", analysis.get_progression_harmoniousness(prog.mod_labeling), "BREAKS", analysis.check_progression_grammar(prog.mod_labeling));

    var self = this;
    if (!self.progressions) { self.progressions = {}; }
    if (!self.labelings) { self.labelings = {}; }

    self.progressions[line] = prog;

    // revert to SELECTED one by UI
    if (SELECTED_KEY) {
      prog = _.find(sorted_progressions, function(p) {
        return p.key === SELECTED_KEY;
      });
    }

    SELECTED_PROGRESSION = prog;
    self.labelings[line] = sorted_progressions;

    var uiEl = module.exports.build_ui_for_progression(prog);
    self.$el.find(".progression").append(uiEl);

    module.exports.set_controls_for_progression(prog, sorted_progressions);

    setTimeout(function() {
      console.log("FINDING MODULATION OPPORTUNITIES");
      prog.variations = generator.get_possible_variations(prog);

      var histEl = module.exports.build_histogram_for_progression(prog);
      self.$el.find(".histogram").append(histEl);
      
    }, 100);


  },
  show_chord_progression: function(id) {
    this.$el.find(".tab-pane").hide();
    this.$el.find(id).show();
  },
  analyze_chords: _.debounce(function() {
    var chord_str = this.$el.find("textarea").val();
    var val = clean_line(chord_str);

    if (val === module.exports.old_val) {
      return;
    }

    $(".loading").show();
    module.exports.old_val = val;

    $(".progression, .histogram").empty();
  
    var self = this;
    setTimeout(function() {
      self.analyze_progression_str(chord_str);
      $(".loading").hide();
    }, 100);
  }, 500),
  click_chord: function(e, el) {
    var chord = $(e.target).html();
    bootloader.require("app/client/synth", function(synth) {
      synth.play_chord(chord);
      
    });
  },
  play_chords: function() {
    var lines  = get_chords_from_str($("textarea").val());
    var index = 0;
    var playNextChord = function() {
      if (index >= lines.length) {
        return;
      }

      var duration = 1000;

      bootloader.require("app/client/synth", function(synth) {
        synth.play_chord(get_chord_name(lines[index]), duration);
        $(".chord").removeClass("playing");
        $($(".chord").get(index)).addClass("playing");
        index += 1;
        setTimeout(playNextChord, duration);
        
      });
    };

    playNextChord();

  },
  change_key: function(e) {
    var key = $(e.target).val();
    var progression;
    var line = clean_line($("textarea").val());
    var labelings = this.labelings[line];
    _.each(labelings, function(p) {
      if (progression) {
        return;
      }

      if (key === p.key) {
        progression = p;
      }
    });

    if (!progression.variations) {
      progression.variations = generator.get_possible_variations(progression);
    }

    SELECTED_KEY = key;
    SELECTED_PROGRESSION = progression;

    this.$el.find(".histogram").empty();
    this.$el.find(".progression").empty();

    var histEl = this.build_histogram_for_progression(progression);
    this.$el.find(".histogram").append(histEl);

    var uiEl = module.exports.build_ui_for_progression(progression);
    this.$el.find(".progression").append(uiEl);
    this.set_controls_for_progression(progression, labelings);
  },
  events: {
    "keydown textarea" : "analyze_chords",
    "click .analyze" : "analyze_chords",
    "click .play" : "play_chords",
    "click .hist_key" : "click_chord",
    "change .key_selector" : "change_key"
  }


};
