var normal = require("app/client/normal");

var synth = T("SynthDef").play();

synth.def = function(opts) {
  var VCO = T("saw", {freq:opts.freq});
  
  var cutoff = T("env", {table:[8000, [opts.freq, 500]]}).bang();
  var VCF    = T("lpf", {cutoff:cutoff, Q:2}, VCO);

  var EG  = T("adsr", {a:150, d:500, s:0.45, r:1500, lv:0.6});
  var VCA = EG.append(VCF).bang();


  return VCA;
};

module.exports = {
  play_chord: function(chord, duration) {
    try {
    chord = normal.get_normal_chord(chord.name || chord);
    var teoria_chord = teoria.chord(chord);
    } catch(e) {
      console.log("CANT DO CHORD", chord, e);
      return;
    }
    duration = duration || 1000;

    var chord_notes = _.shuffle(teoria_chord.notes());
    _.each(chord_notes, function(note, index) {
      var midi = note.midi();
      for (var i = 0; i < 4; i++ ){

        setTimeout(function() { 
          synth.noteOff(midi);
          synth.noteOn(midi, 20);
        }, Math.min(i * 50, duration) - 50);
      }

      setTimeout(function() {
        synth.noteOff(midi);
      }, duration + 50);

    });
  }
};
