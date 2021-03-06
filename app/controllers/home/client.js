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
var grammar_matrix = require("app/client/grammar_matrix");
var Progression = require("app/client/progression");
var normal = require("app/client/normal");
var mixtures = require("app/client/mixtures");
var generator = require("app/client/generator");

var BARS_PER_LINE = 8;
var LAST_SELECTED_INDEX;

var SELECTED_PROGRESSION;
var SELECTED_CHORD;
var SELECTED_CHORD_INDEX;

function clean_line(line) {
  var lines = _.filter(line.replace(/\s\s/g, " ").split(), function(l) { return l; });
  return lines.join(" ");
}

function get_func_name(func) {
  var flats = 0;
  var sharps = 0;

  while (func.indexOf("b") === 0) {
    func = func.slice(1);
    flats++;
  }

  while (func.indexOf("#") === 0) {
    func = func.slice(1);
    sharps++;
  }

  if (func.indexOf("m") > 0) {
    func = func.toLowerCase();
    func = func.replace(/m/, "");

  }

  if (func.indexOf("M") > 0) {
    func = func.toUpperCase();
    func = func.replace(/M/, "");
  }

  while (flats > 0) {
    func = 'b' + func; 
    flats--;
  }

  while (sharps > 0) {
    func = '#' + func; 
    sharps--;

  } 

  return func;

}

function get_chord_classname(chord) {
  return normal.get_simple_key(chord).replace("#", "s");
}

function get_chord_name(chord) {
  try {
    var chord_name = normal.get_flavored_key(chord);
    chord_name = chord_name[0].toUpperCase() + chord_name.slice(1);
    return chord_name.replace("dom", "7").replace("dim", "d").replace("M", "");
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

function invert_chord(chord, index) {


      var new_chord = teoria.chord(chord).simple();
      var chord_name = get_chord_name(chord);

      var new_root = new_chord[index || 1];
      var inversion = chord_name + "/" + new_root;
      return inversion;

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
      wipe_els($(".hist_row, .hist_key, .hist_controls"));
      module.exports.close_histogram();
    } else {
      OPENED = SELECTED_CHORD;
      module.exports.open_histogram(progression);
    }


  },

  open_histogram: function(progression, index) {
   
    var closehistEl = $(".close_hist");
    closehistEl.html("<span class='' />close</span>");
    closehistEl.addClass("pal");

    $(".hist_control").removeClass("active");
    $(".hist_control.mods").addClass("active");
    $(".modulation_table").addClass("opened");


    wipe_els($(".hist_row, .hist_key, .hist_controls"));
    $(".modulation_controls").removeClass("hidden").slideDown();
    module.exports.highlight_cells(progression, index || SELECTED_CHORD_INDEX);

  },
  close_histogram: function() {
    OPENED = false;
    var closehistEl = $(".close_hist");
    closehistEl.addClass("pal");
    closehistEl.html("<span class=''>mods</span>");
    $(".modulation_controls").slideUp();
    $(".modulation_table").removeClass("opened");
    module.exports.show_original();
  },

  build_modulation_for_progression: function(progression) {
    var histograms = analysis.get_chord_histograms(progression);
    console.log("WEIGHTED HISTOGRAM", histograms.weighted);
    console.log("UNWEIGHTED ", histograms.unweighted);


    var parentEl = $("<div />");
    var overallEl = $("<div />");

    if (!$(".hist_head").length) {
      // get the hist out of the way
      var closehistEl = $("<a href='#' class='rfloat close_hist' style='cursor: pointer; text-decoration: underline; color: #ddd;' />");
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
      rowEl.attr("data-key", key);
      key = normal.get_simple_key(key);

      if ($(".key_" + get_chord_classname(key)).length) {
        return;
      }

      var funcession = [ "I", "vii", "V", "ii", "IV", "vi", "iii" ];
      if (!normal.chord_is_major(key)) {
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
        el.attr("data-chord", chord);
        el.attr("data-chord_name", get_chord_name(chord));

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

      optionEl.html(chord_key);
      optionEl.attr('value', prog.key);

      if (progression.key === prog.key) {
        optionEl.attr('selected', true);
      }
      keySelect.append(optionEl);
    });

    var breaks = analysis.check_progression_grammar(progression.labeling);

    var mod_breaks = analysis.check_progression_grammar(progression.mod_labeling);

    function make_like_el(likeliness, likeEl) {
      var likeliness_ratio = parseInt(likeliness / progression.chord_list.length * 100, 10);
      // likeliness is between 200 and -200 or something
      likeEl.css("line-height", "2em");
      likeEl.css("height", "50px");
      if (likeliness_ratio > 150) {
        likeEl.css("border-bottom", "5px solid #15d115");
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

      return likeEl;

    }

    var likeEl = controlsEl.find(".likeliness_ratio");
    var modLikeEl = controlsEl.find(".mod_likeliness_ratio");
    modLikeEl.hide();
    make_like_el(progression.mod_likeliness, modLikeEl);
    make_like_el(progression.likeliness, likeEl);

    controlsEl.find(".harmoniousness").html(progression.likeliness);
    controlsEl.find(".mod_harmoniousness").html("NA");
    controlsEl.find(".mod_grammar_breaks").html("NA");
    controlsEl.find(".alternate_key").html("NA");
    if (progression.mod_likeliness !== progression.likeliness) {
      modLikeEl.show();
      controlsEl.find(".mod_harmoniousness").html(progression.mod_likeliness);
      controlsEl.find(".mod_grammar_breaks").html(mod_breaks);
      controlsEl.find(".alternate_key").html(_.uniq(_.values(progression.modulations)));
    }

    controlsEl.find(".grammar_breaks").html(breaks);
    controlsEl.find(".current_key").html(progression.key);


  },

  build_bars_for_progression: function(progression) {
    var parentEl = $("<div class='col-md-12' />");
    var histograms = analysis.get_chord_histograms(progression);

    // should sort by the circle of fifths, probably
    var keys = _.keys(histograms.weighted);
    var total = 0;
    var max = 0;
    _.each(histograms.weighted.direct.raw, function(count, key) {
      total += count;
      max = Math.max(max, count);
    });

    function build_hist_el(count, key) {

      var histEl = $("<span> </span>");
      histEl.addClass("pal");
      var height_ratio = parseInt(count / max * 100, 10);
      histEl.css({
        "background-color": "#babdb6",
        "display": "inline-block",
        "margin-right": "10px",
        "margin-bottom" : "5px",
        "width": "40px",
        "height": parseInt(height_ratio * 50 / 100.0, 10) + "px"
      });

      histEl.html(key);
      return histEl;
    }

    var chordParent = $("<div class='col-md-6'> </div>");
    chordParent.append("<h2 class='clearfix'>chords</h2>");
    _.each(histograms.weighted.direct.raw, function(count, key) {
      var histEl = build_hist_el(count, key);
      chordParent.append(histEl);
    });
    parentEl.append(chordParent);

    chordParent = $("<div class='col-md-6'> </div>");
    chordParent.append("<h2 class='clearfix'>implied chords</h2>");
    _.each(histograms.weighted.implied.raw, function(count, key) {
      var histEl = build_hist_el(count, key);
      histEl.css("opacity", 0.5);
      chordParent.append(histEl);
    });
    parentEl.append(chordParent);
    return parentEl;

  },

  build_ui_for_progression: function(progression) {
    var self = this;
    var parentEl = $("<div />");
    parentEl.append("<hr />");
    var progressionEl = $("<div class='clearfix' />");
    var grammar_breaks = analysis.get_progression_breaks(progression.labeling);
    var chromaticisms = mixtures.find(progression.labeling);
    var mod_chromaticisms = mixtures.find(progression.mod_labeling);

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
      chordLabel.html(get_func_name(progression.labeling[index]) + "<br /> <span class=''>" + get_chord_name(current_key) + "</span>");

      chordEl.text(progression.chord_list[index] + " (" + get_chord_name(progression.chord_list[index]) + ")");

      var modEl = $("<a class='rfloat mods col-md-4 col-xs-6'>what next?</a>");
      modEl.css("font-size", "14px");
      modEl.on("click", function() {
        SELECTED_CHORD_INDEX = index;
        SELECTED_CHORD = progression.chord_list[index];
        OPENED = SELECTED_CHORD;
        module.exports.open_histogram(progression, index);
      });

      // add something to the chromaticisms?
      if (mixtures.is_mixture(progression.labeling[index])) {
        chordLabel.addClass("mixture_" + chromaticisms[index]);
        if (chromaticisms[index] !== 'original') {
          chordLabel.attr('title', chromaticisms[index] + " mixture");
        }

      }


      chordEl.append($("<div class='clearfix'/>"));
      chordEl.append(chordLabel);
      chordEl.append(modEl);

      if (progression.mod_labeling[index] !== progression.labeling[index]) {
        var modLabel = $("<div class='mod_label'/>");
        if (mixtures.is_mixture(progression.mod_labeling[index])) {
          modLabel.addClass("mixture_" + mod_chromaticisms[index]);
          modLabel.attr('title', mod_chromaticisms[index] + " mixture");

        }
        modLabel.html(get_func_name(progression.mod_labeling[index]) + "<br /> <span class=''>" + mod_key.toUpperCase() + "</span>");
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
        if (OPENED) {
          closehistEl.html("<span>close</span>");
        } else {
          closehistEl.html("<span>mods</span>");

        }

        if (get_chord_name(SELECTED_CHORD) !== get_chord_name(chord)) {
          closehistEl.fadeOut(function() {
            closehistEl.fadeIn();
          });
        }

        SELECTED_CHORD = progression.chord_list[index];
        SELECTED_CHORD_INDEX = index;
        bootloader.require("app/client/synth", function(synth) {
          try {
            synth.play_chord(progression.chord_list[index]);
          } catch(e) {
            console.log("CANT PLAY CHORD", e, progression.chord_list[index]);
            synth.play_chord(normal.get_flavored_key(progression.chord_list[index]));
          }
        });
      });


    });

    parentEl.append(progressionEl);

    return parentEl;
  },

  highlight_cells: function(progression, index) {
    LAST_SELECTED_INDEX = index + 1;
    if (!OPENED) {
      module.exports.open_histogram();
    }

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
    var relatives = relative_modulations[normal.get_simple_key(chord)];

    // For available...
    var available = [
      [progression.key, "", []],
      [progression.modulations[index] || progression.key, "", []],
      [chord, "", []]
    ];

    _.each(common_chord_modulations[current_key + "M"], function(chords, dest_key) {
      var chord_key = normal.get_simple_key(chord);
      if (chords[chord_key]) {
        available.push([dest_key, get_chord_name(chord_key), chords[chord_key]]);
      }
    });

    _.each(relatives, function(reason, relative) {
      var chordEl = $(".chord_" + get_chord_classname(relative));
      chordEl.addClass("relative");
    });

    var chord_key = normal.get_simple_key(chord);
    var keys_with_chord = grammar_matrix.KEYS_WITH_CHORD[chord_key];
    _.each(keys_with_chord, function(interval, dest_key) {
        available.push([normal.get_flavored_key(dest_key), chord_key, []]);
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
      var chromaticisms = _.filter(mixtures.find(p.labeling), function(c) { return c !== "original"; });

      return -(p.likeliness - _.keys(chromaticisms).length);
    });

    var prog = sorted_progressions[0];
    console.log("HARMONIOUSNESS", analysis.get_progression_harmoniousness(prog.mod_labeling), "BREAKS", analysis.check_progression_grammar(prog.mod_labeling));

    var self = this;
    if (!self.progressions) { self.progressions = {}; }
    if (!self.labelings) { self.labelings = {}; }

    self.progressions[line] = prog;

    SELECTED_PROGRESSION = prog;
    self.labelings[line] = sorted_progressions;

    var barEl = module.exports.build_bars_for_progression(prog);
    self.$el.find(".progression_info .histogram").empty();
    self.$el.find(".progression_info .histogram").append(barEl);

    var uiEl = module.exports.build_ui_for_progression(prog);
    self.$el.find(".progression").append(uiEl);

    module.exports.set_controls_for_progression(prog, sorted_progressions);

    setTimeout(function() {
      console.log("FINDING MODULATION OPPORTUNITIES");
      prog.variations = generator.get_possible_variations(prog);

      var histEl = module.exports.build_modulation_for_progression(prog);
      self.$el.find(".modulation_table .mod_table").append(histEl);
      
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

    $(".progression, .modulation_table .mod_table").empty();
    module.exports.close_histogram();
  
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
        synth.play_chord(lines[index], duration);
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

    SELECTED_PROGRESSION = progression;

    this.$el.find(".modulation_table .mod_table").empty();
    this.$el.find(".progression").empty();

    var histEl = this.build_modulation_for_progression(progression);
    this.$el.find(".modulation_table .mod_table").append(histEl);

    var uiEl = module.exports.build_ui_for_progression(progression);
    this.$el.find(".progression").append(uiEl);
    this.set_controls_for_progression(progression, labelings);
  },
  show_original: function() {
    $(".hist_control").removeClass("active");
    $(".hist_control.mods").addClass("active");

    var cells = $(".hist_key");
    _.each(cells, function(cell) {
      if ($(cell).hasClass("hist_head")) {
        return;
      }

      var chord_name = $(cell).data("chord_name");

      $(cell).html(chord_name);
    });

  },
  show_inversions: function(index) {
    $(".hist_control").removeClass("active");
    if (index > 1) {
      $(".hist_control.sinvs").addClass("active");
    } else {
      $(".hist_control.invs").addClass("active");
    }
    var cells = $(".hist_key");
    _.each(cells, function(cell) {
      if ($(cell).hasClass("hist_head")) {
        return;
      }

      var chord = $(cell).data("chord");
      if (!chord) {
        return;
      }

      var inversion = invert_chord(chord, index);

      $(cell).html(inversion);
    });
  },
  show_secondary_mixtures: function() {
    $(".hist_control").removeClass("active");
    $(".hist_control.alts").addClass("active");


    // Maybe we should implement the spellings for certain chords...
    // neopolitan, and so on

    var rows = $(".hist_row");
    var substitutions = {
      "v" : "V",
      "ii": "iiM",
      "iii" : "iiiM",
      "vi" : "viM",
      "vii" : "viiM",
      "III": "biiim",
      "VI": "bvim"
    };

    var suffixations = {
      "I" : "7",
      "IV" : "7",
      "V" : "7",
      "Im" : "7",
      "iv" : "7",
      "v" : "7",


    };

    _.each(rows, function(row) {
      // ummm... this thingie...
      var key = $(row).data("key");
      $(row).find(".hist_key").addClass("unsubbed");
      _.each(substitutions, function(use, sub) {
        var to_sub = $(row).find(".func_" + sub);
        var chord = to_sub.data("chord");
        var sub_chord = Progression.get_chord_for_function(use, key);
        if (!sub_chord) {
          return;
        }
        // what is current key, though?
        to_sub.html(get_chord_name(sub_chord) + (suffixations[sub] || ""));
        to_sub.removeClass('unsubbed');
      });

      $(row).find(".hist_key.unsubbed").html("&nbsp;");

    });
    


  },
  show_mixtures: function() {
    var callbacks = {
      "ii" : function(chord, new_chord) {
        return invert_chord(new_chord);
      }
    };
  },
  show_simple_mixtures: function() {
    $(".hist_control").removeClass("active");
    $(".hist_control.subs").addClass("active");

    // modal mixture chords I know of...
    // from Major, we can pull bIII, bVI or bVII (is bVII really a thing?)
    var rows = $(".hist_row");
    var substitutions = {
      "Im" : "I",
      "I" : "Im",
      "ii" : "biiM",
      "III" : "iiiM",
      "iv" : "IV",
      "V" : "v",
      "IV" : "iv",
      "VI" : "vim",
      "iii" : "biiiM",
      "vi" : "bviM",
      "vii" : "bviiM"
    };

    var callbacks = {
    };


    _.each(rows, function(row) {
      // ummm... this thingie...
      var key = $(row).data("key");
      $(row).find(".hist_key").addClass("unsubbed");
      _.each(substitutions, function(use, sub) {
        var to_sub = $(row).find(".func_" + sub);
        var chord = to_sub.data("chord");
        var sub_chord = Progression.get_chord_for_function(use, key);
        if (!sub_chord) {
          return;
        }

        if (callbacks[sub]) {
          sub_chord = callbacks[sub](chord, get_chord_name(sub_chord));
        } else {
          sub_chord = get_chord_name(sub_chord);
        }

        to_sub.html(sub_chord);
        to_sub.removeClass('unsubbed');
      });

      $(row).find(".hist_key.unsubbed").html("&nbsp;");

    });
    

  },
  update_modulation_table: function(e) {
    var controlEl = $(e.target).closest(".hist_control");
    $(".hist_control").removeClass("active");
    controlEl.addClass("active");
    if (controlEl.hasClass("mods")) {
      module.exports.show_original();

    }
    if (controlEl.hasClass("invs")) {
      module.exports.show_inversions();

    }
    if (controlEl.hasClass("sinvs")) {
      module.exports.show_inversions(2);
    }
    if (controlEl.hasClass("subs")) {
      module.exports.show_simple_mixtures();

    }
    if (controlEl.hasClass("alts")) {
      module.exports.show_secondary_mixtures();

    }

  },

  // IF THE HISTOGRAM IS OPEN AND WE AREN"T TYPING IN THE TEXTBOX...
  handle_keydown: _.throttle(function(e) {
    switch(e.keyCode) {
      case 192:
      case 48:
        module.exports.show_original();
        break;
      case 49:
        module.exports.show_inversions();
        break;
      case 50:
        module.exports.show_inversions(2);
        break;
      case 51:
        module.exports.show_simple_mixtures();
        break;
      case 52:
        module.exports.show_secondary_mixtures();
        break;
    }


    // "0" = 48?
  }, 200),
  events: {
    "keydown" : "handle_keydown",
    "keydown textarea" : "analyze_chords",
    "click .analyze" : "analyze_chords",
    "click .play" : "play_chords",
    "click .hist_key" : "click_chord",
    "change .key_selector" : "change_key",
    "click .modulation_controls" : "update_modulation_table"
  }


};
