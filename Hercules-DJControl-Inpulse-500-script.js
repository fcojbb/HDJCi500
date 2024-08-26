// DJControl_Inpulse_500_script.js
var DJCi500 = {};

///////////////////////////////////////////////////////////////
//                       USER OPTIONS                        //
///////////////////////////////////////////////////////////////

// Use the browser knob with Mixxx window out of focus 
DJCi500.browserOffFocusMode = false;

// Initial declarations
DJCi500.initialVinylMode = true;
DJCi500.initialPflMaster = false;

// Jog Wheel
DJCi500.scratchScale = 1.0; // How fast scratching is.
DJCi500.scratchShiftMultiplier = 4; // How much faster seeking (shift+scratch) is than scratching.
DJCi500.bendScale = 0.8; // How fast bending is.
DJCi500.fastSeekScale = 4;

// Set initial property
DJCi500.xFaderEnabled = true;
DJCi500.xFaderScratch = false;

// Loop in/out
DJCi500.loopAdjustIn = [false, false, false, false];
DJCi500.loopAdjustOut = [false, false, false, false];
DJCi500.loopAdjustMultiply = 40;
// Store timer IDs
DJCi500.timers = {};

// Class ColorMapper: color-mapper-api.d.ts (source)
DJCi500.PadColorMapper = new ColorMapper({
  0xFF0000: 0x60, //Red
  0xF00000: 0x40, //Dark Red
  0x000080: 0x03, //Blue
  0x0000FF: 0x02, //Dark Blue
  0x008000: 0x1C, //Green
  0x006400: 0x10, //Dark Green
  0x00FFFF: 0x1F, //Cyan
  0x00E6E6: 0x12, //Dark Cyan
  0x00FF00: 0x30, //Lime
  0x32CD32: 0x5C, //Dark Lime
  0xFF1493: 0x63, //Fuchsia
  0x800080: 0x42, //Dark Fuchsia  
  0xFFA500: 0x74, //Orange
  0xFF4500: 0x4C, //Dark Orange
  0xFFD700: 0x7C, //Yellow
  0xB8860B: 0x50, //Dark Yellow
  0xFFFFFF: 0x7F, //White
  0x808080: 0x52 //Dark White  
});

DJCi500.PadColors = {
  red:        0x60, //Red
  darkRed:    0x40, //Dark Red
  blue:       0x03, //Blue
  darkBlue:   0x02, //Dark Blue
  green:      0x1C, //Green
  darkGreen:  0x10, //Dark Green
  cyan:       0x1F, //Cyan
  darkCyan:   0x12, //Dark Cyan
  lime:       0x30, //Lime
  darkLime:   0x5C, //Dark Lime
  fuchsia:    0x63, //Fuchsia
  darkFuchsia:0x42, //Dark Fuchsia  
  orange:     0x74, //Orange
  darkOrange: 0x4C, //Dark Orange
  yellow:     0x7C, //Yellow
  darkYellow: 0x50, //Dark Yellow
  white:      0x7F, //White
  darkWhite:  0x52, //Dark White  
  nocolor:    0x00, //No Color
};

// Beat JUMP PAD (pairs and left:backward/right:forward)
const pairColorsOn = [0x1F, 0x1F, 0x03, 0x03, 0x7C, 0x7C, 0x60, 0x60]; //Top: Cyan and Blue, Botton: Orange and Red
const pairColorsOff = [0x12, 0x12, 0x02, 0x02, 0x50, 0x50, 0x40, 0x40]; //Top: Cyan Low and Blue Low, Botton: Orange Low and Red Low

// SLICER
DJCi500.selectedSlicerDomain = [8, 8, 8, 8]; //length of the Slicer domain
DJCi500.slicerBeatsPassed = [0, 0, 0, 0]; // Slicer storage
DJCi500.slicerPreviousBeatsPassed = [0, 0, 0, 0]; // Slicer storage
DJCi500.slicerTimer = [false, false, false, false];
//DJCi500.slicerJumping = [0, 0, 0, 0];
DJCi500.slicerActive = [false, false, false, false];
DJCi500.slicerAlreadyJumped = [false, false, false, false];
DJCi500.slicerButton = [-1, -1, -1, -1];
DJCi500.slicerModes = {
  'contSlice': 0,
  'loopSlice': 1
};

DJCi500.activeSlicerMode = [
  DJCi500.slicerModes.contSlice,
  DJCi500.slicerModes.contSlice,
  DJCi500.slicerModes.contSlice,
  DJCi500.slicerModes.contSlice
];

DJCi500.slicerLoopBeat8 = [0, 0, 0, 0];

///////////////////////////////////////////////////////////////
//                  Master VU Meter callbacks                //
///////////////////////////////////////////////////////////////

// VU Meter Master
DJCi500.vuMeterUpdateMaster = function(value, _group, control) {
  // Reserve the red led for peak indicator, this will in turn, make
  // the display more similar (I hope) to what Mixxx VU shows
  value = script.absoluteLinInverse(value, 0.0, 1.0, 0, 124);
  var control = (control === 'vu_meter_left') ? 0x40 : 0x41;
  midi.sendShortMsg(0xB0, control, value);
};

DJCi500.vuMeterPeakLeftMaster = function(value, _group, _control, _status) {
  if (value) {
    midi.sendShortMsg(0x90, 0x0A, 0x7F);
  } else {
    midi.sendShortMsg(0x90, 0x0A, 0x00);
  };
};

DJCi500.vuMeterPeakRightMaster = function(value, _group, _control, _status) {
  if (value) {
    midi.sendShortMsg(0x90, 0x0F, 0x7F);
  } else {
    midi.sendShortMsg(0x90, 0x0F, 0x00);
  };
};

// Deck VU Meter Deck
DJCi500.vuMeterUpdateDeck = function(value, group, _control, _status) {
  // Reserve the red led for peak indicator, this will in turn, make
  // the display more similar (I hope) to what Mixxx VU shows
  value = script.absoluteLinInverse(value, 0.0, 1.0, 0, 125);
  if (DJCi500.deckA.currentDeck === group) {
    midi.sendShortMsg(0xB1, 0x40, value);
  } else if (DJCi500.deckB.currentDeck === group) {
    midi.sendShortMsg(0xB2, 0x40, value);
  };
};

DJCi500.vuMeterPeakDeck = function(value, group, _control, _status) {
  var channel = 0x00;
  if (DJCi500.deckA.currentDeck === group) {
    channel = 0x91;
  } else if (DJCi500.deckB.currentDeck === group) {
    channel = 0x92;
  };

  if (channel > 0x00) {
    if (value) {
      midi.sendShortMsg(channel, 0x39, 0x7F);
    } else {
      midi.sendShortMsg(channel, 0x39, 0x00);
    };
  };
};

///////////////////////////////////////////////////////////////
//                         Deck Number                       //
///////////////////////////////////////////////////////////////

DJCi500.numberIndicator = function(value, group, _control, _status) {
  if (DJCi500.deckA.currentDeck === group) {
    midi.sendShortMsg(0x91, 0x30, value);
  } else if (DJCi500.deckB.currentDeck === group) {
    midi.sendShortMsg(0x92, 0x30, value);
  };
};

// This is where we choose the channel using the FX buttons and light them up correctly
DJCi500.DeckSelector = function(_channel, control, value, _status, _group) {
  if (value === 0x7F) {
    var deckChosen = control - 0x13;   // FX1 is 0x14, so this will yield the number
    switch (deckChosen) {
      case 1:
        DJCi500.Deck.setCurrentDeck('[Channel1]');
        DJCi500.updateDeckStatus('[Channel1]');
        midi.sendShortMsg(0x90, 0x14, 0x7F);
        midi.sendShortMsg(0x90, 0x16, 0x00);
        break;
      case 2:
        DJCi500.Deck.setCurrentDeck('[Channel2]');
        DJCi500.updateDeckStatus('[Channel2]');
        midi.sendShortMsg(0x90, 0x15, 0x7F);
        midi.sendShortMsg(0x90, 0x17, 0x00);
        break;
      case 3:
        DJCi500.Deck.setCurrentDeck('[Channel3]');
        DJCi500.updateDeckStatus('[Channel3]');
        midi.sendShortMsg(0x90, 0x14, 0x00);
        midi.sendShortMsg(0x90, 0x16, 0x7F);
        break;
      case 4:
        DJCi500.Deck.setCurrentDeck('[Channel4]');
        DJCi500.updateDeckStatus('[Channel4]');
        midi.sendShortMsg(0x90, 0x15, 0x00);
        midi.sendShortMsg(0x90, 0x17, 0x7F);
        break;
    };
  };
};

///////////////////////////////////////////////////////////////
//                         FX Buttons                        //
///////////////////////////////////////////////////////////////

DJCi500.fxSelIndicator = function(_value, group, _control, _status) {
  var deckA = DJCi500.deckA.currentDeck;
  var deckB = DJCi500.deckB.currentDeck;
  var active = false;

  if (group === '[EffectRack1_EffectUnit1]') {
    
    active = engine.getValue(group, 'group_' + deckA + '_enable');

    if (active) {
      midi.sendShortMsg(0x96, 0x63, 0x74);
    } else {
      midi.sendShortMsg(0x96, 0x63, 0x00);
    };

    active = engine.getValue(group, 'group_' + deckB + '_enable');

    if (active) {
      midi.sendShortMsg(0x97, 0x63, 0x74);
    } else {
      midi.sendShortMsg(0x97, 0x63, 0x00);
    };

  } else if (group === '[EffectRack1_EffectUnit2]') {
    
    active = engine.getValue(group, 'group_' + deckA + '_enable');

    if (active) {
      midi.sendShortMsg(0x96, 0x67, 0x74);
    } else {
      midi.sendShortMsg(0x96, 0x67, 0x00);
    };

    active = engine.getValue(group, 'group_' + deckB + '_enable');

    if (active) {
      midi.sendShortMsg(0x97, 0x67, 0x74);
    } else {
      midi.sendShortMsg(0x97, 0x67, 0x00);
    };
  };
};

DJCi500.fxEnabledIndicator = function(_value, group, _control, _status) {
  var deckA = DJCi500.deckA.currentDeck;
  var deckB = DJCi500.deckB.currentDeck;
  var active = engine.getValue(group, 'enabled');

  if (group == '[QuickEffectRack1_' + deckA + ']') {
    midi.sendShortMsg(0x96, 0x66, active ? 0x1C : 0x60)
  } else if (group == '[QuickEffectRack1_' + deckB + ']') {
    midi.sendShortMsg(0x97, 0x66, active ? 0x1C : 0x60)
  };
};

DJCi500.updateEffectStatus = function(midiChannel, _channel) {
  let status = false;
  for (var i = 1; i <= 3; i++) {
    status = status || engine.getValue('[EffectRack1_EffectUnit' + midiChannel + '_Effect' + i + ']', 'enabled');
  }
  return status;
  // return engine.getValue('[EffectRack1_EffectUnit' + midiChannel + ']', 'group_[Channel' + channel + ']_enable');
};

///////////////////////////////////////////////////////////////
//                         Crossfader                        //
///////////////////////////////////////////////////////////////

// Crossfader control, set the curve
DJCi500.crossfaderSetCurve = function(_channel, _control, value, _status, _group) {
  switch(value) {
    case 0x00:
      // Mix
      script.crossfaderCurve(0,0,127);
      DJCi500.xFaderScratch = false;
      break;
    case 0x7F:
      // Scratch
      script.crossfaderCurve(127,0,127);
      DJCi500.xFaderScratch = true;
      break;
  };
};

// Crossfader enable or disable
DJCi500.crossFaderEnabled = function(_channel, _control, value, _status, group) {
  switch(value) {
    case 0x00:
      // Off
      DJCi500.xFaderEnabled = false;
      engine.setValue(group, 'crossfader', 64); //Set the crossfader in the middle
      break;
    case 0x7F:
      // On
      DJCi500.xFaderEnabled = true;
      break;
  };
};

///////////////////////////////////////////////////////////////
//                            LEDs                           //
///////////////////////////////////////////////////////////////

// Update the Tempo and phase sync leds
DJCi500.tempoLEDs = function () {
  // Current active decks
  var deckA = DJCi500.deckA.currentDeck;
  var deckB = DJCi500.deckB.currentDeck;

  //Tempo:
  var tempo1 = engine.getValue(deckA, 'bpm');
  var tempo2 = engine.getValue(deckB, 'bpm');
  var diff = tempo1 - tempo2;
  
  //Check double tempo:
  var doubleTempo = 0;   

  if (diff > 0) {
    if ((tempo1 / tempo2) > 1.5) {
      doubleTempo = 1; 
      diff = tempo1/2 - tempo2;
    };
  } else {
      if ((tempo2 / tempo1) > 1.5) {
      doubleTempo = 1;
      diff = tempo1 - tempo2/2;
    };
  };

  if ( diff < -0.25) {
    //Deck1
    midi.sendShortMsg(0x91, 0x1E, 0x0);
    midi.sendShortMsg(0x91, 0x1F, 0x7F);
    midi.sendShortMsg(0x91, 0x2C, 0x0);
    //Deck2
    midi.sendShortMsg(0x92, 0x1F, 0x0);
    midi.sendShortMsg(0x92, 0x1E, 0x7F);
    midi.sendShortMsg(0x92, 0x2C, 0x0);

    //clear beatalign leds
    //Deck1
    midi.sendShortMsg(0x91, 0x1C, 0x0);
    midi.sendShortMsg(0x91, 0x1D, 0x0);
    midi.sendShortMsg(0x91, 0x2D, 0x0);
    //Deck2
    midi.sendShortMsg(0x92, 0x1C, 0x0);
    midi.sendShortMsg(0x92, 0x1D, 0x0);
    midi.sendShortMsg(0x92, 0x2D, 0x0);
  } else if ( diff > 0.25) {
    //Deck1
    midi.sendShortMsg(0x91, 0x1F, 0x0);
    midi.sendShortMsg(0x91, 0x1E, 0x7F);
    midi.sendShortMsg(0x91, 0x2C, 0x0);
    //Deck2
    midi.sendShortMsg(0x92, 0x1E, 0x0);
    midi.sendShortMsg(0x92, 0x1F, 0x7F);
    midi.sendShortMsg(0x92, 0x2C, 0x0);

    //clear beatalign leds
    //Deck1
    midi.sendShortMsg(0x91, 0x1C, 0x0);
    midi.sendShortMsg(0x91, 0x1D, 0x0);
    midi.sendShortMsg(0x91, 0x2D, 0x0);
    //Deck2
    midi.sendShortMsg(0x92, 0x1C, 0x0);
    midi.sendShortMsg(0x92, 0x1D, 0x0);
    midi.sendShortMsg(0x92, 0x2D, 0x0);
  } else {
    //Deck1
    midi.sendShortMsg(0x91, 0x1E, 0x0);
    midi.sendShortMsg(0x91, 0x1F, 0x0);
    midi.sendShortMsg(0x91, 0x2C, 0x7F);
    //Deck2
    midi.sendShortMsg(0x92, 0x1E, 0x0);
    midi.sendShortMsg(0x92, 0x1F, 0x0);
    midi.sendShortMsg(0x92, 0x2C, 0x7F);
  
    //Do beat alignement only if the tracks are already on Tempo
    // and only if they are playing
    if ((engine.getValue(deckA, 'play_latched')) && (engine.getValue(deckB, 'play_latched'))) {
      var beat1 = engine.getValue(deckA, 'beat_distance');
      var beat2 = engine.getValue(deckB, 'beat_distance');

      if (doubleTempo) {
        if (tempo1 > tempo2) {
          if (beat2 > 0.5) {
            beat2 -= 0.5;
          }
          beat2 *= 2;
        } else {              //tempo2 >(=) tempo1
          if (beat1 > 0.5) {
            beat1 -= 0.5;
          }
          beat1 *= 2;
        };
      };
      
      diff = beat1 - beat2;

      if (diff < 0) {
        diff = 1 + diff;
      } else if ((diff < 0.02) || (diff > 1-0.02)) {
        //Deck1
        midi.sendShortMsg(0x91, 0x1C, 0x0);
        midi.sendShortMsg(0x91, 0x1D, 0x0);
        midi.sendShortMsg(0x91, 0x2D, 0x7F);
        //Deck2
        midi.sendShortMsg(0x92, 0x1C, 0x0);
        midi.sendShortMsg(0x92, 0x1D, 0x0);
        midi.sendShortMsg(0x92, 0x2D, 0x7F);
      } else if ( diff < 0.5) {
        //Deck1
        midi.sendShortMsg(0x91, 0x1C, 0x0);
        midi.sendShortMsg(0x91, 0x1D, 0x7F);
        midi.sendShortMsg(0x91, 0x2D, 0x0);
        //Deck2
        midi.sendShortMsg(0x92, 0x1D, 0x0);
        midi.sendShortMsg(0x92, 0x1C, 0x7F);
        midi.sendShortMsg(0x91, 0x2D, 0x0);
      } else {
        //Deck1
        midi.sendShortMsg(0x91, 0x1D, 0x0);
        midi.sendShortMsg(0x91, 0x1C, 0x7F);
        midi.sendShortMsg(0x91, 0x2D, 0x0);
        //Deck2
        midi.sendShortMsg(0x92, 0x1C, 0x0);
        midi.sendShortMsg(0x92, 0x1D, 0x7F);
        midi.sendShortMsg(0x92, 0x2D, 0x0);
      }
    } else {
      //Deck1
      midi.sendShortMsg(0x91, 0x1C, 0x0);
      midi.sendShortMsg(0x91, 0x1D, 0x0);
      midi.sendShortMsg(0x91, 0x2D, 0x0);
      //Deck2
      midi.sendShortMsg(0x92, 0x1C, 0x0);
      midi.sendShortMsg(0x92, 0x1D, 0x0);
      midi.sendShortMsg(0x92, 0x2D, 0x0);
    };
  }; //else tempo
};

// After a channel change, make sure we read the current status
DJCi500.updateDeckStatus = function(group) {
  var playing = engine.getValue(group, 'play_indicator');
  var volume = script.absoluteLinInverse(engine.getValue(group, 'vu_meter'), 0.0, 1.0, 0, 127);

  // Update the vinyl button
  var vinylState = false;
  var deckIndex = parseInt(group.charAt(8)) - 1;
  var channel = ((group === '[Channel1]') || (group === '[Channel3]')) ? 1 : 2;
  if (channel === 1) {
    vinylState = DJCi500.Deck.vinylButtonState[deckIndex];
  } else {
    vinylState = DJCi500.Deck.vinylButtonState[deckIndex];
  }
  midi.sendShortMsg(0x90 + channel, 0x03, (vinylState) ? 0x7F : 0x00);
  midi.sendShortMsg(0xB0 + channel, 0x40, volume);
  midi.sendShortMsg(0x90 + channel, 0x30, playing ? 0x7F : 0x00);

  // Update the fx rack selection
  DJCi500.fxSelIndicator(0, '[EffectRack1_EffectUnit1]', 0, 0);
  DJCi500.fxSelIndicator(0, '[EffectRack1_EffectUnit2]', 0, 0);

  DJCi500.fxEnabledIndicator(0, '[QuickEffectRack1_' + group + ']', 0, 0);

  // Slicer
  switch(group) {
    case '[Channel1]':
      DJCi500.slicerBeat1.disconnect();
      DJCi500.slicerBeat1 = engine.makeConnection('[Channel1]', 'beat_active', DJCi500.slicerBeatActive);
      DJCi500.slicerBeat1.trigger();
      break;
    case '[Channel2]':
      DJCi500.slicerBeat2.disconnect();
      DJCi500.slicerBeat2 = engine.makeConnection('[Channel2]', 'beat_active', DJCi500.slicerBeatActive);
      DJCi500.slicerBeat2.trigger();
      break;
    case '[Channel3]':
      DJCi500.slicerBeat1.disconnect();
      DJCi500.slicerBeat1 = engine.makeConnection('[Channel3]', 'beat_active', DJCi500.slicerBeatActive);
      DJCi500.slicerBeat1.trigger();
      break;
    case '[Channel4]':
      DJCi500.slicerBeat2.disconnect();
      DJCi500.slicerBeat2 = engine.makeConnection('[Channel4]', 'beat_active', DJCi500.slicerBeatActive);
      DJCi500.slicerBeat2.trigger();
      break;
  };
};

///////////////////////////////////////////////////////////////
//                          SLICER                           //
///////////////////////////////////////////////////////////////
DJCi500.slicerButtonFunc = function(_channel, control, value, _status, group) {
  var index = control - 0x20,
    deck = parseInt(group.charAt(8)) - 1,
    domain = DJCi500.selectedSlicerDomain[deck],
    beatsToJump = 0,
    passedTime = engine.getValue(group, 'beat_distance'),
    loopEnabled = engine.getValue(group, 'loop_enabled');

  if (value) {
    DJCi500.slicerButton[deck] = index;
    //Maybe I need to update this (seems sometimes it does not work.)
    //DJCi500.slicerBeatsPassed[deck] = Math.floor((playposition * duration) * (bpm / 60.0));
    beatsToJump = (index * (domain / 8)) - ((DJCi500.slicerBeatsPassed[deck] % domain));
    beatsToJump -= passedTime;

    //activate the one-shot timer for the slip end.
    if (!DJCi500.slicerTimer[deck]){
      DJCi500.slicerTimer[deck] = true;
      var timer_ms = (1-passedTime)*60.0/engine.getValue(group, 'bpm')*1000;

      //quality of life fix for not-precise hands or beatgrid
      // also good fix for really small timer_ms values.
      if ( (passedTime >= 0.8) &&
        //this is because while looping doing this thing on beat 8 break the flow.
        ((!loopEnabled) || (DJCi500.slicerBeatsPassed[deck] % domain) !== (domain-1)) ) {
        timer_ms += 60.0/engine.getValue(group, 'bpm')*1000;
      };

      engine.beginTimer( timer_ms,
        //'DJCi500.slicerTimerCallback('+group+')', true);
        function() {
          //need to do this otherwise loop does not work on beat 8 because of slip.
          if ((engine.getValue(group, 'loop_enabled') === true)){
            //on the wiki it says it returns an integer, but I tested and instead seems a Real value:
            // But it does not work cuz the value does not relate to beat. they are samples.
            //var endLoop = engine.getValue(group, 'loop_end_position');
            engine.setValue(group, 'reloop_toggle', true); //false
            engine.setValue(group, 'slip_enabled', false);
            //Aleatory behavior, probably because the slip does not always have completed before 'returning'
            //so I need to introduce a timer waiting the slip function to be completely resolved
            engine.beginTimer( 2, function () {
              var bpm_file = engine.getValue(group, 'file_bpm'),
                playposition = engine.getValue(group, 'playposition'),
                duration = engine.getValue(group, 'duration');
              /*
              if (Math.floor((playposition * duration) * (bpm_file / 60.0)) > endLoop) {
                engine.setValue(group, 'beatjump', -8);
              }*/
              engine.setValue(group, 'reloop_toggle', true);},
              true);
          }
          else {
            engine.setValue(group, 'slip_enabled', false);
          }
          DJCi500.slicerTimer[deck] = false;
          DJCi500.slicerButton[deck] = -1;},
        true);
    };

    engine.setValue(group, 'slip_enabled', true);

    //Because of Mixxx beatjump implementation, we need to deactivate the loop before jumping
    // also there is no 'lopp_deactivate' and loop_activate false does not work.
    if (loopEnabled) {
      engine.setValue(group, 'reloop_toggle', true);
    };
    engine.setValue(group, 'beatjump', beatsToJump);
    //This sadly does not work.
    //engine.setValue(group, 'loop_move', -beatsToJump);
    if (loopEnabled){
      engine.setValue(group, 'reloop_toggle', true);
    };
    midi.sendShortMsg((0x96+(deck % 2)), 0x20+index, 0x62);
  }; //if value
};

//this below is connected to beat_active
DJCi500.slicerBeatActive = function(_value, group, _control) {
  // This slicer implementation will work for constant beatgrids only!
  var deck = parseInt(group.charAt(8)) - 1;
  var channel = deck % 2;

  print('***** SLICER ACTIVE VALUE: ' + DJCi500.slicerActive[deck]);
  print('***** SLICER: deck ' + deck + ' channel ' + channel);

  var  bpm = engine.getValue(group, 'file_bpm');
  var  playposition = engine.getValue(group, 'playposition');
  var  duration = engine.getValue(group, 'duration');
  var  slicerPosInSection = 0;
  var  ledBeatState = false;
  var  domain = DJCi500.selectedSlicerDomain[deck];

    //this works.
  if (engine.getValue(group, 'beat_closest') === engine.getValue(group, 'beat_next')) {
    return;
  };

  DJCi500.slicerBeatsPassed[deck] = Math.floor((playposition * duration) * (bpm / 60.0));

  if (DJCi500.slicerActive[deck]){
    slicerPosInSection = Math.floor((DJCi500.slicerBeatsPassed[deck] % domain) / (domain / 8));
    // PAD Led control:
    if (DJCi500.slicerButton[deck] !== slicerPosInSection) {
      for (var i = 0; i < 8; i++) {
        active = ((slicerPosInSection === i) ? ledBeatState : !ledBeatState) ? 0x03 : 0x7F;
        midi.sendShortMsg((0x96+channel), 0x20+i, active);
      };
    } else {
      midi.sendShortMsg((0x96+channel), 0x20+DJCi500.slicerButton[deck], 0x62);
    }
  } else {
    DJCi500.slicerAlreadyJumped[deck] = false;
    DJCi500.slicerPreviousBeatsPassed[deck] = 0;
  };
};

///////////////////////////////////////////////////////////////
//                        Loop In and Out                    //
///////////////////////////////////////////////////////////////
/*DJCi500.toggleLoopAdjustIn = function (channel, _control, value, _status, group) {
  if (value === 0 || engine.getValue(group, 'loop_enabled' === 0)) {
    return;
  };
  DJCi500.loopAdjustIn[channel-1] = !DJCi500.loopAdjustIn[channel-1];
  DJCi500.loopAdjustOut[channel-1] = false;
};

DJCi500.toggleLoopAdjustOut = function(channel, _control, value, _status, group) {
  if (value === 0 || engine.getValue(group, 'loop_enabled' === 0)) {
    return;
  }
  DJCi500.loopAdjustOut[channel-1] = !DJCi500.loopAdjustOut[channel-1];
  DJCi500.loopAdjustIn[channel-1] = false;
};*/

DJCi500.setReloopLight = function(status, value) {
// Two signals are sent here so that the light stays lit/unlit in its shift state too
//midi.sendShortMsg(status, 0x4D, value);
//midi.sendShortMsg(status, 0x50, value);
};

DJCi500.setLoopButtonLights = function(status, value) {
  midi.sendShortMsg(status, 0x09, value); //DJCi500.setLoopButtonLights(0x91, 0x7F);
  midi.sendShortMsg(status, 0x0A, value); //DJCi500.setLoopButtonLights(0x92, 0x7F);
};

DJCi500.startLoopLightsBlink = function(channel, control, status, group) {
  var blink = 0x7F;

  DJCi500.stopLoopLightsBlink(group, control, status);

  DJCi500.timers[group][control] = engine.beginTimer(500, () => {
    blink = 0x7F - blink;

    // When adjusting the loop out position, turn the loop in light off
    if (DJCi500.loopAdjustOut[channel-1]) {
        midi.sendShortMsg(status, 0x09, 0x00);
        //midi.sendShortMsg(status, 0x09, 0x00);
    } else {
        midi.sendShortMsg(status, 0x09, blink);
       // midi.sendShortMsg(status, 0x09, blink);
    };

    // When adjusting the loop in position, turn the loop out light off
    if (DJCi500.loopAdjustIn[channel-1]) {
        midi.sendShortMsg(status, 0x0A, 0x00);
       // midi.sendShortMsg(status, 0x0A, 0x00);
    } else {
        midi.sendShortMsg(status, 0x0A, blink);
       // midi.sendShortMsg(status, 0x04, blink);
    };
  });
};

DJCi500.stopLoopLightsBlink = function(group, control, status) {
  DJCi500.timers[group] = DJCi500.timers[group] || {};

  if (DJCi500.timers[group][control] !== undefined) {
      engine.stopTimer(DJCi500.timers[group][control]);
  }
  DJCi500.timers[group][control] = undefined;
  DJCi500.setLoopButtonLights(status, 0x7F);
};

DJCi500.loopToggle = function(value, group, control) {
  const status = group === '[Channel1]' ? 0x91 : 0x92,
      channel = group === '[Channel1]' ? 0 : 1;

  DJCi500.setReloopLight(status, value ? 0x7F : 0x00);

  if (value) {
      DJCi500.startLoopLightsBlink(channel, control, status, group);
  } else {
      DJCi500.stopLoopLightsBlink(group, control, status);
      DJCi500.loopAdjustIn[channel-1] = false;
      DJCi500.loopAdjustOut[channel-1] = false;
  }
};

DJCi500.cueLoopCallLeft = function(_channel, _control, value, _status, group) {
  if (value) {
      engine.setValue(group, 'loop_scale', 0.5);
  }
};

DJCi500.cueLoopCallRight = function(_channel, _control, value, _status, group) {
  if (value) {
      engine.setValue(group, 'loop_scale', 2.0);
  }
};

///////////////////////////////////////////////////////////////
//                        Others                             //
///////////////////////////////////////////////////////////////

// Browser button. We move it to a custom JS function to avoid having to focus the Mixxx window for it to respond
DJCi500.moveLibrary = function(_channel, _control, value, _status, _group) {
  if (value > 0x3F) {
    if (DJCi500.browserOffFocusMode) {
      engine.setValue('[Playlist]', 'SelectTrackKnob', -1);
    } else {
      engine.setValue('[Library]', 'MoveUp', 1);
    }
  } else {
    if (DJCi500.browserOffFocusMode) {
      engine.setValue('[Playlist]', 'SelectTrackKnob', 1);
    } else {
      engine.setValue('[Library]', 'MoveDown', 1);
    };
  };
};

DJCi500.spinback_button = function(_channel, _control, value, _status, group) {
  var deck = parseInt(group.substring(8,9)); // work out which deck we are using
  engine.spinback(deck, value > 0, 2.5); // use default starting rate of -10 but decrease speed more quickly
};

DJCi500.pflMasterButton = function (_channel, _control, value, _status, _group) {
  
  if(value === 0x7F && !DJCi500.initialPflMaster) {
    engine.setValue('[Master]', 'headSplit', true);
  } else if (value === 0x00 && DJCi500.initialPflMaster) {
    engine.setValue('[Master]', 'headSplit', false);
  };
  DJCi500.initialPflMaster = !DJCi500.initialPflMaster;
};



///////////////////////////////////////////////////////////////
//                       Deck Constructor                    //
// Implement a constructor for a custom Deck object specific //
// to your controller, to 'this' in the context of the       //
// generic components.Deck constructor                       //
// https://developer.mozilla.org/en-US/docs/Web/JavaScript   //
// /Reference/Global_Objects/Function/call                   //
///////////////////////////////////////////////////////////////
DJCi500.Deck = function (deckNumbers, midiChannel) {
  // Call the generic Deck constructor to setup the currentDeck and deckNumbers properties,
  // using Function.prototype.call to assign the custom Deck being constructed
  // to 'this' in the context of the generic components.Deck constructor
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call
  components.Deck.call(this, deckNumbers);
  
  // Allow components to access deck variables
  var deckData = this;

  // For loop and looprolls
  var fractions = ['0.125', '0.25', '0.5', '1', '2', '4', '8', '16'];
  //  var shiftFractions = ['0.03125', '0.0625', '32', '64', '128', '256', '512', '1024'];
 
  // For beatjumps
  var jumpValues = ['1', '1', '2', '2', '4', '4', '8', '8'];
  //  var jumpValuesShift = ['16', '16', '32', '32', '64', '64', '128', '128'];
  
  // Brake status for this deck
  this.slowPauseSetState = [true, true, true, true];

 // Vinyl button state
 this.vinylButtonState = [
  DJCi500.initialVinylMode,
  DJCi500.initialVinylMode,
  DJCi500.initialVinylMode,
  DJCi500.initialVinylMode
  ];

  // Pitch ranges and status
  this.pitchRanges = [0.06, 0.10, 0.20, 0.35, 0.50, 0.75, 0.90, 1.0]; //select pitch range
  this.pitchRangeId = 0; //id of the array, one for each deck

  // Effect section components
  this.onlyEffectEnabled = false;
  this.filterAndEffectEnabled = false;

  // Make sure the shift button remaps the shift actions
  this.shiftButton = new components.Button({
    midi: [0x90 + midiChannel, 0x04],
    input: function (_channel, _control, value, _status, _group) {
      if (value === 0x7F) {
        deckData.forEachComponent(function (component) {
          if (component.unshift) {
            component.shift();
          };
        });
      } else {
        deckData.forEachComponent(function (component) {
          if (component.unshift) {
            component.unshift();
          };
        });
      };
    },
  });

  this.loadButton = new components.Button({
    midi: [0x90 + midiChannel, 0x0D],
    shiftOffset: 3,
    shiftControl: true,
    shiftChannel: true,
    sendShifted: true,
    unshift: function () {
      this.inKey = 'LoadSelectedTrack';
    },
    shift: function () {
      this.inKey = 'eject';
    },
  });

  // Loop In button
  this.loopInButton = new components.Button({
    midi: [0x90 + midiChannel, 0x09],
    inKey : 'loop_in',
    outKey : 'loop_enabled',
  });

  this.loopInButtonShift = new components.Button({
    midi: [0x93 + midiChannel, 0x09],
    input: function (channel, _control, value, _status, group) {
      if (value === 0 || engine.getValue(group, 'loop_enabled' === 0)) {
        return;
      };
      DJCi500.loopAdjustIn[channel-1] = !DJCi500.loopAdjustIn[channel-1];
      DJCi500.loopAdjustOut[channel-1] = false;
    }
  });

  // Loop Out button
  this.loopOutButton = new components.Button({
    midi: [0x90 + midiChannel, 0x0A],
    inKey : 'loop_out',
    outKey : 'loop_enabled',
  });
  
  this.loopOutButtonShift = new components.Button({
    midi: [0x93 + midiChannel, 0x0A],
    input: function (channel, _control, value, _status, group) {
      if (value === 0 || engine.getValue(group, 'loop_enabled' === 0)) {
        return;
      }
      DJCi500.loopAdjustOut[channel-1] = !DJCi500.loopAdjustOut[channel-1];
      DJCi500.loopAdjustIn[channel-1] = false;
    },
  });
  
  // AutoLoop Encoder (push)
  this.loopEncoderPush = new components.Button({
    midi: [0x90 + midiChannel, 0x2C],
    shiftOffset: 3,
    shiftControl: false,
    shiftChannel: true,
    sendShifted: true,
    unshift: function () {
      this.inKey = 'reloop_toggle';
    },
    shift: function () {
      this.inKey = 'beatloop_4_activate';
    },
  });

  // AutoLoop Encoder (rotatory)
  this.loopEncoder = new components.Encoder({
    midi: [0xB0 + midiChannel, 0x0E],
    shiftOffset: 3,
    shiftControl: false,
    shiftChannel: true,
    sendShifted: true,
    input: function (_channel, _control, value, _status, _group) {
      // FIXME: Toggle for loop halve and double??
      var deckGroup = deckData.currentDeck;
      if (value >= 0x40) {
        engine.setValue(deckGroup, 'loop_halve', true);
      } else {
        engine.setValue(deckGroup, 'loop_double', true);
      }
    }
  });

  // Transport section
  // Play button
  this.playButton = new components.PlayButton({
    midi: [0x90 + midiChannel, 0x07],
    shiftOffset: 3,
    shiftControl: false,
    shiftChannel: true,
    sendShifted: true,
    unshift: function () {
      this.input = function (_channel, _control, value, _status, _group) {
        if (value === 0x7F) {
          if (engine.getValue(deckData.currentDeck, 'play_latched')) { //play_indicator play_latched
            var deck = parseInt(deckData.currentDeck.charAt(8));
            if (deckData.slowPauseSetState[deck - 1]) {
              engine.brake(deck, 1, 54); //((status & 0xF0) !=== 0x80 && value > 0),
            } else {
              script.toggleControl(deckData.currentDeck, 'play');
            };
          } else {
            script.toggleControl(deckData.currentDeck, 'play');
          };
        };
      };
    },
    shift: function () {
      this.input = function (_channel, _control, _value, _status, _group) {
        engine.setValue(deckData.currentDeck, 'play_stutter', true);
      };
    },
  });

  // Cue button
  this.cueButton = new components.CueButton({
    midi: [0x90 + midiChannel, 0x06],
    shiftOffset: 3,
    shiftControl: true,
    shiftChannel: true,
    sendShifted: true,
    unshift: function () {
      //In CDJ mode, when playing, returns to the cue point and pauses.
      //If stopped, sets a cue point at the current location.
      //If stopped and at a cue point, plays from that point until released (set to 0.)
      this.inKey = 'cue_default';
    },
    shift: function () {
      this.inKey = 'start_stop'; // Seeks a player to the start and then stops it.
    },
  });

  // Sync button
  this.syncButton = new components.SyncButton({
    midi: [0x90 + midiChannel, 0x05],
    shiftOffset: 3,
    shiftControl: false,
    shiftChannel: true,
    sendShifted: true,
    shift: function () {
      this.inKey = 'sync_key';
    },
  });
  // PFL Deck button
  this.pflButton = new components.Button({
    midi: [0x90 + midiChannel, 0x0C],
    group: this.currentDeck,
    key: 'pfl',
    type: components.Button.prototype.types.toggle, 
  });

  // Vinyl Mode button
  this.vinylButton = new components.Button({
    midi: [0x90 + midiChannel, 0x03],
    shiftOffset: 3,
    shiftControl: false,
    shiftChannel: true,
    sendShifted: true,
    unshift: function () {
      this.input = function(channel, _control, value, status, group) {
        if (value === 0x7F) {
          var deck = parseInt(deckData.currentDeck.charAt(8)) - 1;
          var new_status = !deckData.vinylButtonState[deck];
          // deckData.jogWheel.vinylMode = new_status;
          // deckData.jogWheelShift.vinylMode = new_status;
          deckData.vinylButtonState[deck] = new_status;
          var new_message = new_status ? 0x7F : 0x00;
          midi.sendShortMsg(this.midi[0], 0x03, new_message);
        } 
      };
    },
    shift: function () {
      this.input = function (channel, control, value, status, group) {
        if (value === 0x7F){
          var deck = parseInt(deckData.currentDeck.charAt(8)) - 1;
          deckData.slowPauseSetState[deck] = !deckData.slowPauseSetState[deck];
        }
      };
    }
  });

  // SLIP Mode button
  this.slipButton = new components.Button({
    midi: [0x90 + midiChannel, 0x01],
    type: components.Button.prototype.types.toggle,
    shiftOffset: 3,
    shiftControl: false,
    shiftChannel: true,
    sendShifted: true,
    key: 'slip_enabled',
  });

  // Quant Mode button
  this.quantButton = new components.Button({
    midi: [0x90 + midiChannel, 0x02],
    type: components.Button.prototype.types.toggle,
    shiftOffset: 3,
    shiftControl: false,
    shiftChannel: true,
    sendShifted: true,
    outKey: 'quantize',
    unshift: function () {
      this.inKey = 'quantize';
    },
    shift: function () {
      this.inKey = 'keylock';
    },
  });

  // Knobs
  this.volumeFader = new components.Pot({
    midi: [0xB0 + midiChannel, 0x00],
    inKey: 'volume',
  });

  this.filterKnob = new components.Pot({
    midi: [0xB0 + midiChannel, 0x01],
    number: midiChannel,
    group: '[QuickEffectRack1_[Channel' + midiChannel + ']]',
    inKey: 'super1',
  });

  this.eqKnob = [];
  for (var i = 0; i <= 2; i++) {
    this.eqKnob[i] = new components.Pot({
      midi: [0xB0 + midiChannel, 0x01 + (i + 1)],
      group: '[EqualizerRack1_' + this.currentDeck + '_Effect1]',
      inKey: 'parameter' + (i + 1),
    });
  };

  // Pitch-tempo fader
  this.pitchFader = new components.Pot({
    midi: [0xB0 + midiChannel, 0x08],
    group: this.currentDeck,
    key:'rate',
  });

  // Jog Wheels
  // this.jogWheel = new components.JogWheelBasic({
  //   midi: [0xB0 + midiChannel, 0x0A],
  //   deck: midiChannel, // whatever deck this jogwheel controls, in this case we ignore it
  //   wheelResolution: 248, // how many ticks per revolution the jogwheel has
  //   alpha: 1 / 8,
  //   beta: (1 / 8) / 32,
  //   rpm: 33 + 1 / 3,
  //   inputWheel: function (_channel, _control, value, _status, group) {
  //     var deckNumber = script.deckFromGroup(group);
  //     //var newValue = value - 64;
  //     var newValue = this.inValueScale(value);
  //     if (engine.isScratching(deckNumber)) {
  //       engine.scratchTick(deckNumber, newValue*DJCi500.fastSeekScale); // Scratch!
  //     } else {
  //       engine.setValue(group, 'jog', newValue*DJCi500.bendScale); // Pitch bend
  //     };
  //   },
  //   inputTouch: function (_channel, _control, value, status, group) {
  //     var deckNumber = script.deckFromGroup(group);
  //     //if ((status & 0xF0) === 0x90) {    // If button down
  //     if (value === 0x7F) {  // Some wheels send 0x90 on press and release, so you need to check the value
  //       engine.scratchEnable(deckNumber, this.wheelResolution, this.rpm, this.alpha, this.beta);
  //     } else {    // If button up
  //       engine.scratchDisable(deckNumber);
  //     };
  //   },
  // });
  this.jogWheel = new components.JogWheelBasic({
    midi: [0xB0 + midiChannel, 0x0A],
    deck: midiChannel, // whatever deck this jogwheel controls, in this case we ignore it
    wheelResolution: 248, // how many ticks per revolution the jogwheel has
    alpha: 1 / 8,
    beta: (1 / 8) / 32,
    rpm: 33 + 1 / 3,
    inputWheel: function (channel, _control, value, _status, group) {
      const deckNumber = script.deckFromGroup(group);
      const loopEnabled = engine.getValue(group, 'loop_enabled');
      
      var newVal = value - 64;
       
      if (loopEnabled > 0) {
        if (DJCi500.loopAdjustIn[channel-1]) {
          newVal = newVal * DJCi500.loopAdjustMultiply + engine.getValue(group, 'loop_start_position');
          engine.setValue(group, 'loop_start_position', newVal);
          return;
        };

        if (DJCi500.loopAdjustOut[channel-1]) {
          newVal = newVal * DJCi500.loopAdjustMultiply + engine.getValue(group, 'loop_end_position');
          engine.setValue(group, 'loop_end_position', newVal);
          return;
        };
      };
  
      if (engine.isScratching(deckNumber)) {
        engine.scratchTick(deckNumber, newVal);
      } else { // fallback
        engine.setValue(group, 'jog', newVal * DJCi500.bendScale);
      };
    },
    inputTouch: function (channel, _control, value, _status, group) {
      const deckNumber = script.deckFromGroup(group);

      if (DJCi500.loopAdjustIn[channel-1] || DJCi500.loopAdjustOut[channel-1]) {
        return;
      };
  
      if (value !== 0 && this.vinylButtonState[deckNumber - 1]) {
        engine.scratchEnable(deckNumber, this.wheelResolution, this.rpm, this.alpha, this.beta);
      } else {
        engine.scratchDisable(deckNumber);
      };
    },
  });

  // We only check and attach for slicer mode, but we have all
  //////////////////////////////////////////////////////////////////////////
  //            pad buttons here if we need something extra!              //
  //////////////////////////////////////////////////////////////////////////
  this.padSelectButtons = [];
  for (var i = 0; i <= 7; i++) {
    this.padSelectButtons[i] = new components.Button({
      midi: [0x90 + midiChannel, 0x0F + i],
      input: function (_channel, control, _value, _status, _group) {
        var deck = parseInt(deckData.currentDeck.charAt(8)) - 1;
        if (control === 0x11) {
          DJCi500.slicerActive[deck] = true;
        } else {
          DJCi500.slicerActive[deck] = false;
        }
      },
    });
  };

  // Hotcue buttons (PAD Mode 1)
  this.hotcueButtons = [];
  for (var i = 0; i <= 7; i++) {
    this.hotcueButtons[i] = new components.HotcueButton({
      midi: [0x95 + midiChannel, 0x00 + i],
      number: i+1,
      shiftOffset: 8,
      shiftControl: true,
      sendShifted: true,
      colorMapper: DJCi500.PadColorMapper,
      off: 0x00,
    });
  };

  // Loop buttons (PAD Mode 2)
  this.loopButtons = [];
  for (var i = 0; i <= 7; i++) {
    this.loopButtons[i] = new components.Button({
      midi: [0x95 + midiChannel, 0x10 + i],
      number: i+1,
      shiftOffset: 8,
      shiftControl: false,
      sendShifted: true,
      on: 0x1C, // Green
      off: 0x10, // Lime
      outKey: 'beatloop_' + fractions[i] + '_enabled',
      inKey: 'beatloop_' + fractions[i] + '_toggle',
    });
  };

  // Beat Jump Buttons (PAD Mode 2 + Shift) this.beatJumpButtons = [];
  this.loopShiftButtons = [];
  for (var i = 0; i <= 7; i++) {
    var movement = (i+1 % 2 === 0) ? '_forward' : '_backward';
    var jmpVal = jumpValues[i];
    this.loopShiftButtons[i] = new components.Button({
      midi: [0x95 + midiChannel, 0x18 + i],
      number: i+1,
      shiftOffset: 8,
      shiftControl: true,
      sendShifted: true,
      on: pairColorsOn[i],
      off: pairColorsOff[i],
      jump: 'beatjump_' + jmpVal + movement,
      input: function (_channel, control, value, status, _group) {
        if (value === 0x7F) {
          engine.setValue(deckData.currentDeck, this.jump, true);
          midi.sendShortMsg(status, control, this.on);
        } else {
          midi.sendShortMsg(status, control, this.off);
        }
      }
    });
  };

  // Slicer buttons (PAD Mode 3)
  this.slicerButtons = [];
  for (var i = 0; i <= 7; i++) {
    this.slicerButtons[i] = new components.Button({
      midi: [0x95 + midiChannel, 0x20 + i],
      number: i+1,
      shiftOffset: 8,
      shiftControl: true,
      sendShifted: true,
      input: function (channel, control, value, status, _group) {
        // This is kind of a hack... somehow this is not getting the group correctly!
        DJCi500.slicerButtonFunc(channel, control, value, status, deckData.currentDeck);
      },
    });
  };

  // Sampler buttons (PAD Mode 4)
  this.samplerButtons = [];
  for (var i = 0; i <= 7; i++) {
    this.samplerButtons[i] = new components.SamplerButton({
      midi: [0x95 + midiChannel, 0x30 + i],
      number: i+1,
      shiftOffset: 8,
      shiftControl: true,
      sendShifted: true,
      loaded: 0x42,
      empty: 0x00,
      playing: 0x63,
      looping: 0x74,
    });
  };

  // Pitch buttons (PAD Mode 5)
  this.pitchDownSemiTone = new components.Button({
    midi: [0x95 + midiChannel, 0x40],
    on: pairColorsOn[1],
    off: pairColorsOff[1],
    input: function (_channel, control, value, status, group) {
      if (value === 0x7F) {
        engine.setValue(group, 'pitch_down', 1);
        midi.sendShortMsg(status, control, this.on);
      }
      else {
        midi.sendShortMsg(status, control, this.off);
      }
    },
  });

  this.pitchUpSemiTone = new components.Button({
    midi: [0x90 + midiChannel, 0x41],
    on: pairColorsOn[6],
    off: pairColorsOff[6],
    input: function (_channel, control, value, status, group) {
      if (value === 0x7F) {
        engine.setValue(group, 'pitch_up', 1);
        midi.sendShortMsg(status, control, this.on);
      }
      else {
        midi.sendShortMsg(status, control, this.off);
      }
    },
  });

  this.pitchDownTone = new components.Button({
    midi: [0x90 + midiChannel, 0x42],
    on: pairColorsOn[0],
    off: pairColorsOff[0],
    input: function (_channel, control, value, status, group) {
      if (value === 0x7F) {
        engine.setValue(group, 'pitch_down', 1);
        engine.setValue(group, 'pitch_down', 1);
        midi.sendShortMsg(status, control, this.on);
      }
      else {
        midi.sendShortMsg(status, control, this.off);
      }
    },
  });

  this.pitchUpTone = new components.Button({
    midi: [0x95 + midiChannel, 0x43],
    on: pairColorsOn[6],
    off: pairColorsOff[6],
    input: function (_channel, control, value, status, group) {
      if (value === 0x7F) {
        engine.setValue(group, 'pitch_up', 1);
        engine.setValue(group, 'pitch_up', 1);
        midi.sendShortMsg(status, control, this.on);
      }
      else {
        midi.sendShortMsg(status, control, this.off);
      }
    },
  });

  this.pitchSliderDecrease = new components.Button({
    midi: [0x95 + midiChannel, 0x44],
    on: pairColorsOn[3],
    off: pairColorsOff[3],
    input: function (_channel, control, value, status, group) {
      if (value === 0x7F) {
        deckData.pitchRangeId = deckData.pitchRangeId - 1;
        if (deckData.pitchRangeId < 0) {
          deckData.pitchRangeId = 0;
        }
        engine.setValue(group, 'rateRange', deckData.pitchRanges[deckData.pitchRangeId]);
        midi.sendShortMsg(status, control, this.on); //17 -- 3B
      }
      else {
        midi.sendShortMsg(status, control, this.off); //3B -- 33
      }
    },
  });

  this.pitchSliderReset = new components.Button({
    midi: [0x95 + midiChannel, 0x45],
    on: pairColorsOn[6],
    off: pairColorsOff[6],
    input: function (_channel, control, value, status, group) {
      if (value === 0x7F) {
        deckData.pitchRangeId = 0;
        engine.setValue(group, 'rateRange', deckData.pitchRanges[deckData.pitchRangeId]);
        midi.sendShortMsg(status, control, this.on); //17 -- 3B
      }
      else {
        midi.sendShortMsg(status, control, this.off); //3B -- 33
      }
    },
  });

  this.pitchSliderReset = new components.Button({
    midi: [0x95 + midiChannel, 0x46],
    on: pairColorsOn[6],
    off: pairColorsOff[6],
    input: function (_channel, control, value, status, group) {
      if (value === 0x7F) {
        deckData.pitchRangeId = 0;
        engine.setValue(group, 'rateRange', deckData.pitchRanges[deckData.pitchRangeId]);
        midi.sendShortMsg(status, control, this.on); //17 -- 3B
      }
      else {
        midi.sendShortMsg(status, control, this.off); //3B -- 33
      }
    },
  });

  this.pitchSliderIncrease = new components.Button({
    midi: [0x95 + midiChannel, 0x47], //fixed chanel and data for pitch ranges
    on: 0x63,
    off: 0x42,
    input: function (_channel, control, value, status, group) {
      if (value === 0x7F) {
        deckData.pitchRangeId++;
        if (deckData.pitchRangeId > 6) {
          deckData.pitchRangeId = 6;
        }
        engine.setValue(group, 'rateRange', deckData.pitchRanges[deckData.pitchRangeId]);
        midi.sendShortMsg(status, control, this.on); //17 -- 3B
      }
      else {
        midi.sendShortMsg(status, control, this.off); //3B -- 33
      }
    },
  });

  // Beatloop rolls buttons (PAD Mode 6)
  this.rollButtons = [];
  for (var i = 0; i <= 7; i++) {
    this.rollButtons[i] = new components.Button({
      midi: [0x95 + midiChannel, 0x50 + i],
      number: i+1,
      shiftOffset: 8,
      shiftControl: true,
      sendShifted: true,
      on: 0x1F,
      off: 0x12,
      key: 'beatlooproll_' + fractions[i] + '_activate',
    });
  };

  // Effect buttons (PAD Mode 8)
  this.effectButtons = [];
  for (var i = 0; i <= 2; i++) {
    // First top row effects buttons, just the effect, disable HPF/LPF knob
    this.effectButtons[i] = new components.Button({
      midi: [0x95 + midiChannel, 0x70 + i],
      number: i+1,
      shiftOffset: 8,
      shiftControl: true,
      sendShifted: true,
      group: '[EffectRack1_EffectUnit' + midiChannel + '_Effect' + (i + 1) +']',
      outKey: 'enabled',
      output: function (value, _group, _control) {
        if (value) {
          this.send(0x7F);
        } else {
          this.send(0x7C);
        }
      },
      unshift: function () {
        // Normal effect button operation, toggling the effect assigned to it
        this.input = function (channel, control, value, _status, _group) {
          var fxNo = control - 0x5F;
          var unit = channel - 0x95;
          if (value === 0x7F) {
            script.toggleControl(this.group, 'enabled');
          }
        };
      },
      shift: function () {
        // Shift button will change the effect to the next in the list
        this.input = function (channel, control, value, _status, _group) {
          var fxNo = control - 0x67;
          var unit = channel - 0x95;
          if (value === 0x7F) {
            engine.setValue(this.group, 'effect_selector', +1);
          }
        };
      }
    });
  };

  // Set the current channel FX route with the two extra PADs
  this.effectButtons[3] = new components.Button({
    midi: [0x95 + midiChannel, 0x73],
    number: 4,
    shiftOffset: 8,
    shiftControl: false,
    sendShifted: false,
    on: 0x1C,
    off: 0x7F,
    group: '[EffectRack1_EffectUnit1]',
    output: function (value, control, status) {
      if (value) {
        midi.sendShortMsg(status, control, this.on);
      } else {
        midi.sendShortMsg(status, control, this.off);
      }
    },
    input: function (_channel, control, value, status, _group) {
      if (value === 0x7F) {
        var deckGroup = deckData.currentDeck;
        script.toggleControl(this.group, 'group_' + deckGroup + '_enable');
      }
    },
  });

  this.effectButtons[4] = new components.Button({
    midi: [0x95 + midiChannel, 0x74],
    number: 5,
    shiftOffset: 8,
    shiftControl: false,
    sendShifted: false,
    group: '[QuickEffectRack1_[Channel' + midiChannel + ']]',
    on: 0x5C,
    off: 0x12,
    input: function (_channel, control, value, status, _group) {
      if (value === 0x7F) {
        engine.setValue(this.group, 'chain_preset_selector', -1);
        midi.sendShortMsg(status, control, this.on); //17 -- 3B
      }
      else {
        midi.sendShortMsg(status, control, this.off); //3B -- 33
      }
    },
  });

  this.effectButtons[5] = new components.Button({
    midi: [0x95 + midiChannel, 0x75],
    number: 6,
    shiftOffset: 8,
    shiftControl: false,
    sendShifted: false,
    group: '[QuickEffectRack1_[Channel' + midiChannel + ']]',
    on: 0x5C,
    off: 0x02,
    input: function (_channel, control, value, status, _group) {
      if (value === 0x7F) {
        engine.setValue(this.group, 'chain_preset_selector', 1);
        midi.sendShortMsg(status, control, this.on); //17 -- 3B
      }
      else {
        midi.sendShortMsg(status, control, this.off); //3B -- 33
      }
    },
  });

  // Filter kill switch
  this.effectButtons[6] = new components.Button({
    midi: [0x95 + midiChannel, 0x76],
    number: 7,
    shiftOffset: 8,
    shiftControl: false,
    sendShifted: false,
    on: 0x1C,
    off: 0x60,
    group: '[QuickEffectRack1_[Channel' + midiChannel + ']]',
    input: function (_channel, control, value, status, _group) {
      if (value === 0x7F) {
        midi.sendShortMsg(status, control, this.on);
        script.toggleControl(this.group, 'enabled');
      } else {
        midi.sendShortMsg(status, control, this.off);
      }
    },
  });

  this.effectButtons[7] = new components.Button({
    midi: [0x95 + midiChannel, 0x77],
    number: 8,
    shiftOffset: 8,
    shiftControl: false,
    sendShifted: false,
    group: '[EffectRack1_EffectUnit2]',
    input: function (_channel, _control, value, _status, _group) {
      if (value === 0x7F) {
        var deckGroup = deckData.currentDeck;
        script.toggleControl(this.group, 'group_' + deckGroup + '_enable');
      }
    },
  });

  // Filter knob is here since it is affected by effects pads
  this.filterFX = new components.Pot({
    midi: [0xB0 + midiChannel, 0x01],
    number: midiChannel,
    group: '[QuickEffectRack1_[Channel' + midiChannel + ']]',
    input: function (_channel, _control, value, _status, _group) {
      engine.setValue('[EffectRack1_EffectUnit' + this.number + ']',
        'super1', script.absoluteNonLin(value, 0, 0.5, 1.0, 0, 127));
    },
  });

  // ... define as many other Components as necessary ...
  // Set the group properties of the above Components and connect
  // their output callback functions. Without this, the group property
  // for each Component would have to be specified to its constructor.
  this.reconnectComponents(function (c) {
    if (c.group === undefined) {
      // 'this' inside a function passed to reconnectComponents
      // refers to the ComponentContainer so 'this' refers to
      // the custom Deck object being constructed
      c.group = this.currentDeck;
    };
  });
  // when called with JavaScript's 'new' keyword, a constructor function
  // implicitly returns 'this'
};

// Give the custom Deck all the methods of the generic deck
DJCi500.Deck.prototype = new components.Deck();

///////////////////////////////////////////////////////////////
//                       INIT PROGRAM                        //
// Mixxx calls this function on startup or when the          //
// controller is enabled in the Mixxx Preferences            //
///////////////////////////////////////////////////////////////

// INIT for the controller and decks
DJCi500.init = function () {
  
  DJCi500.autoHotcueColors = true;
  
  // Take care of the status of the crossfader status
  DJCi500.xFaderEnabled = true;
  DJCi500.xFaderScratch = false;

  // Setup Vinyl buttons LED(one for each deck).
  midi.sendShortMsg(0x91, 0x03, DJCi500.initialVinylMode ? 0x7F : 0x00);
  midi.sendShortMsg(0x92, 0x03, DJCi500.initialVinylMode ? 0x7F : 0x00);

  //Turn On Browser button LED
  midi.sendShortMsg(0x90, 0x05, 0x10);

  // Connect the VUMeters leds
  engine.makeConnection('[Channel1]', 'vu_meter', DJCi500.vuMeterUpdateDeck);
  engine.getValue('[Channel1]', 'vu_meter', DJCi500.vuMeterUpdateDeck);
  engine.makeConnection('[Channel2]', 'vu_meter', DJCi500.vuMeterUpdateDeck);
  engine.getValue('[Channel2]', 'vu_meter', DJCi500.vuMeterUpdateDeck);
  engine.makeConnection('[Channel3]', 'vu_meter', DJCi500.vuMeterUpdateDeck);
  engine.getValue('[Channel3]', 'vu_meter', DJCi500.vuMeterUpdateDeck);
  engine.makeConnection('[Channel4]', 'vu_meter', DJCi500.vuMeterUpdateDeck);
  engine.getValue('[Channel4]', 'vu_meter', DJCi500.vuMeterUpdateDeck);
  engine.makeConnection('[Main]', 'vu_meter_left', DJCi500.vuMeterUpdateMaster);
  engine.getValue('[Main]', 'vu_meter_left', DJCi500.vuMeterUpdateMaster);
  engine.makeConnection('[Main]', 'vu_meter_right', DJCi500.vuMeterUpdateMaster);
  engine.getValue('[Main]', 'vu_meter_right', DJCi500.vuMeterUpdateMaster);
  
  // Deck VU meters peak indicators leds
  engine.makeConnection('[Channel1]', 'peak_indicator', DJCi500.vuMeterPeakDeck);
  engine.makeConnection('[Channel2]', 'peak_indicator', DJCi500.vuMeterPeakDeck);
  engine.makeConnection('[Channel3]', 'peak_indicator', DJCi500.vuMeterPeakDeck);
  engine.makeConnection('[Channel4]', 'peak_indicator', DJCi500.vuMeterPeakDeck);
  engine.makeConnection('[Main]', 'peak_indicator_left', DJCi500.vuMeterPeakLeftMaster);
  engine.makeConnection('[Main]', 'peak_indicator_right', DJCi500.vuMeterPeakRightMaster);

  // Connect number leds
  engine.makeConnection('[Channel1]', 'play_indicator', DJCi500.numberIndicator);
  engine.getValue('[Channel1]', 'play_indicator', DJCi500.numberIndicator);
  engine.makeConnection('[Channel2]', 'play_indicator', DJCi500.numberIndicator);
  engine.getValue('[Channel2]', 'play_indicator', DJCi500.numberIndicator);
  engine.makeConnection('[Channel3]', 'play_indicator', DJCi500.numberIndicator);
  engine.getValue('[Channel3]', 'play_indicator', DJCi500.numberIndicator);
  engine.makeConnection('[Channel4]', 'play_indicator', DJCi500.numberIndicator);
  engine.getValue('[Channel4]', 'play_indicator', DJCi500.numberIndicator);

  // Connect the FX selection leds
  engine.makeConnection('[EffectRack1_EffectUnit1]', 'group_[Channel1]_enable', DJCi500.fxSelIndicator);
  engine.makeConnection('[EffectRack1_EffectUnit2]', 'group_[Channel1]_enable', DJCi500.fxSelIndicator);
  engine.makeConnection('[EffectRack1_EffectUnit1]', 'group_[Channel2]_enable', DJCi500.fxSelIndicator);
  engine.makeConnection('[EffectRack1_EffectUnit2]', 'group_[Channel2]_enable', DJCi500.fxSelIndicator);
  engine.makeConnection('[EffectRack1_EffectUnit1]', 'group_[Channel3]_enable', DJCi500.fxSelIndicator);
  engine.makeConnection('[EffectRack1_EffectUnit2]', 'group_[Channel3]_enable', DJCi500.fxSelIndicator);
  engine.makeConnection('[EffectRack1_EffectUnit1]', 'group_[Channel4]_enable', DJCi500.fxSelIndicator);
  engine.makeConnection('[EffectRack1_EffectUnit2]', 'group_[Channel4]_enable', DJCi500.fxSelIndicator);
  engine.makeConnection('[QuickEffectRack1_[Channel1]]', 'enabled', DJCi500.fxEnabledIndicator);
  engine.makeConnection('[QuickEffectRack1_[Channel2]]', 'enabled', DJCi500.fxEnabledIndicator);
  engine.makeConnection('[QuickEffectRack1_[Channel3]]', 'enabled', DJCi500.fxEnabledIndicator);
  engine.makeConnection('[QuickEffectRack1_[Channel4]]', 'enabled', DJCi500.fxEnabledIndicator);

  //Softtakeover for Pitch fader
  engine.softTakeover('[Channel1]', 'rate', true);
  engine.softTakeover('[Channel2]', 'rate', true);
  engine.softTakeover('[Channel3]', 'rate', true);
  engine.softTakeover('[Channel4]', 'rate', true);
  engine.softTakeoverIgnoreNextValue('[Channel1]', 'rate');
  engine.softTakeoverIgnoreNextValue('[Channel2]', 'rate');
  engine.softTakeoverIgnoreNextValue('[Channel3]', 'rate');
  engine.softTakeoverIgnoreNextValue('[Channel4]', 'rate');

  //Softtakeover for Crossfader
  engine.softTakeover('[Master]', 'crossfader', true);
  engine.softTakeoverIgnoreNextValue('[Master]', 'crossfader');

  //Loop blink
  DJCi500.setLoopButtonLights(0x91, 0x7F);
  DJCi500.setLoopButtonLights(0x92, 0x7F);

  engine.makeConnection('[Channel1]', 'loop_enabled', DJCi500.loopToggle);
  engine.makeConnection('[Channel2]', 'loop_enabled', DJCi500.loopToggle);
  engine.makeConnection('[Channel3]', 'loop_enabled', DJCi500.loopToggle);
  engine.makeConnection('[Channel4]', 'loop_enabled', DJCi500.loopToggle);
 
  // Connect the slicer beats
  DJCi500.slicerBeat1 = engine.makeConnection('[Channel1]', 'beat_active', DJCi500.slicerBeatActive);
  DJCi500.slicerBeat2 = engine.makeConnection('[Channel2]', 'beat_active', DJCi500.slicerBeatActive);
  //var controlsToFunctions = {'beat_active': 'DJCi500.slicerBeatActive'};
  //script.bindConnections('[Channel1]', controlsToFunctions, true);

  // Ask the controller to send all current knob/slider values over MIDI, which will update
  // the corresponding GUI controls in MIXXX.
  midi.sendShortMsg(0xB0, 0x7F, 0x7F);

  // Turn on lights:
  for (var i = 0; i < 2; i++) {

    // MODE 2 + SHIFT: Beat Jumps 
    midi.sendShortMsg(0x96+i, 0x18, pairColorsOff[0]);
    midi.sendShortMsg(0x96+i, 0x19, pairColorsOff[1]);
    midi.sendShortMsg(0x96+i, 0x1A, pairColorsOff[2]);
    midi.sendShortMsg(0x96+i, 0x1B, pairColorsOff[3]);
    midi.sendShortMsg(0x96+i, 0x1C, pairColorsOff[4]);
    midi.sendShortMsg(0x96+i, 0x1D, pairColorsOff[5]);
    midi.sendShortMsg(0x96+i, 0x1E, pairColorsOff[6]);
    midi.sendShortMsg(0x96+i, 0x1F, pairColorsOff[7]);
      
    // MODE 3: SLICER
    midi.sendShortMsg(0x96+i, 0x20, 0x03);
    midi.sendShortMsg(0x96+i, 0x21, 0x03);
    midi.sendShortMsg(0x96+i, 0x22, 0x03);
    midi.sendShortMsg(0x96+i, 0x23, 0x03);
    midi.sendShortMsg(0x96+i, 0x24, 0x03);
    midi.sendShortMsg(0x96+i, 0x25, 0x03);
    midi.sendShortMsg(0x96+i, 0x26, 0x03);
    midi.sendShortMsg(0x96+i, 0x27, 0x03);   
    
    // MODE 5: Key and tempo range controls
    midi.sendShortMsg(0x96+i, 0x40, pairColorsOff[0]);
    midi.sendShortMsg(0x96+i, 0x41, pairColorsOff[1]);
    midi.sendShortMsg(0x96+i, 0x42, pairColorsOff[2]);
    midi.sendShortMsg(0x96+i, 0x43, pairColorsOff[3]);
    midi.sendShortMsg(0x96+i, 0x44, pairColorsOff[4]);
    midi.sendShortMsg(0x96+i, 0x45, 0x60);
    midi.sendShortMsg(0x96+i, 0x46, 0x60);
    midi.sendShortMsg(0x96+i, 0x47, pairColorsOff[7]);

    // MODE 8: FX
    midi.sendShortMsg(0x96+i, 0x70, 0x50);
    midi.sendShortMsg(0x96+i, 0x71, 0x50);
    midi.sendShortMsg(0x96+i, 0x72, 0x50);
    midi.sendShortMsg(0x96+i, 0x73, 0x7F);
    midi.sendShortMsg(0x96+i, 0x74, 0x12);
    midi.sendShortMsg(0x96+i, 0x75, 0x02);
    midi.sendShortMsg(0x96+i, 0x76, 0x60);
    midi.sendShortMsg(0x96+i, 0x77, 0x7F);

    // Light up FX quick effect chain selector buttons
    midi.sendShortMsg(0x96+i, 0x64, 0x30);
    midi.sendShortMsg(0x96+i, 0x65, 0x30);
  };

  DJCi500.tempoTimer = engine.beginTimer(250, DJCi500.tempoLEDs);

  // FX buttons, light them to signal the current deck 1 and 2 as active
  midi.sendShortMsg(0x90, 0x14, 0x7F);
  midi.sendShortMsg(0x90, 0x15, 0x7F);

  // create an instance of your custom Deck object for each side of your controller
  DJCi500.deckA = new DJCi500.Deck([1, 3], 1);
  DJCi500.deckB = new DJCi500.Deck([2, 4], 2);
  DJCi500.deckA.setCurrentDeck('[Channel1]');
  DJCi500.deckB.setCurrentDeck('[Channel2]');

  // Update the fx rack selection
  DJCi500.fxSelIndicator(0, '[EffectRack1_EffectUnit1]', 0, 0);
  DJCi500.fxSelIndicator(0, '[EffectRack1_EffectUnit2]', 0, 0);

  DJCi500.fxEnabledIndicator(0, '[QuickEffectRack1_[Channel1]]', 0, 0);
  DJCi500.fxEnabledIndicator(0, '[QuickEffectRack1_[Channel2]]', 0, 0);
};

///////////////////////////////////////////////////////////////
// Send whatever MIDI messages you need to turn off          //
// the lights off your controller                            //
///////////////////////////////////////////////////////////////
DJCi500.shutdown = function () {
  //cleanup
  midi.sendShortMsg(0x90, 0x05, 0x00); //turn off browser led
  midi.sendShortMsg(0xB0, 0x7F, 0x7E);
};
