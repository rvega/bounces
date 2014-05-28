define(['./Listener', './Source', 'vendors/oss/knob/knob', 'vendors/oss/slider/slider'], function(Listener, Source, Knob, Slider){

   NO_PD = true;

   var AppController = function(){
      this.stageWidth = 600;
      this.stageHeight = 600;

      this.initStage();
      this.initArrowKeys();
      this.initSoundOutputControls();
      this.initPD(function(){
         this.initUIControls();
         this.initSources();
         this.initLoadSave();
         $('#main').show();
         $('#loading').hide();
      }.bind(this));
   };

   ///////////////////////////////////////////////////////////////////////////////// 
   // PureData

   AppController.prototype.initPD = function(callback){
      if(NO_PD){
         callback();
         return;
      }

      // Init PureData engine and load patch.
      PD.configurePlayback(44100, 2, false, false, function(){
         PD.openFile('pd', 'sound-space-no-gui.pd', function(){
            PD.setActive(true);
            callback();
         });
      });
   };

   ///////////////////////////////////////////////////////////////////////////////// 
   // Stage 

   AppController.prototype.initStage = function(){
      $('#stage').attr('width', this.stageWidth).attr('height', this.stageHeight);
      this.stage = new fabric.Canvas('stage',{
         backgroundColor: '#EEE'
      });
      this.stage.selection = false;

      // Hack to fix miscalculation of canvas offset in some cases
      setTimeout(function(){
         var pos = $('.canvas-container').position();
         this.stage._offset.left = pos.left;
         this.stage._offset.top = pos.top;
      }.bind(this),500);

      // Multiple selections should not be rotated or scaled
      this.stage.observe('selection:created', function(e){
         e.target.hasControls = false;
         e.target.hasRotatingPoint= false;
         e.target.borderColor= '#F00';
         e.target.cornerColor= '#F00';
         e.target.cornerSize= 0;

         $('#selected-source').hide();
      });

      this.stage.observe('selection:cleared', function(e){
         $('#selected-source').hide();
      });

      this.stage.observe('object:moving', function(e){
         if(e.target.objects){ //moving several objects
            for(var i in e.target.objects){
               var object = e.target.objects[i];
               var source = object.source; 
               if(!source) continue;
               source.modified(object.left, object.top);
            }
         }
         else{ // moving just one object
            var object = e.target; 
            var source = object.source; 
            if(!source) return;
            source.modified(object.left, object.top);
         }
      });

      this.roomSize = 1;
      this.roomSizeCircles = [];
      var circle = new fabric.Circle({
         radius: this.stageWidth/this.roomSize/2,
         left: this.stageWidth/2,
         top: this.stageHeight/2,
         originX: 'center',
         originY: 'center',
         stroke: '#DDD',
         strokeWidth: 2,
         fill: 'none',
         hasControls: false,
         hasRotatingPoint: false,
         hasBorders: false,
         selectable: false
      });
      this.stage.add(circle);
      this.roomSizeCircles.push(circle);

      circle = new fabric.Circle({
         radius: this.stageWidth/this.roomSize/2 * 0.75,
         left: this.stageWidth/2,
         top: this.stageHeight/2,
         originX: 'center',
         originY: 'center',
         stroke: '#DDD',
         strokeWidth: 2,
         fill: 'none',
         hasBorders: false,
         selectable: false,
         hasControls: false,
         hasRotatingPoint: false
      });
      this.stage.add(circle);
      this.roomSizeCircles.push(circle);

      var circle = new fabric.Circle({
         radius: this.stageWidth/this.roomSize/2 * 0.5,
         left: this.stageWidth/2,
         top: this.stageHeight/2,
         originX: 'center',
         originY: 'center',
         stroke: '#DDD',
         strokeWidth: 2,
         fill: 'none',
         selectable: false,
         hasBorders: false,
         hasControls: false,
         hasRotatingPoint: false
      });
      this.stage.add(circle);
      this.roomSizeCircles.push(circle);
   };

   ///////////////////////////////////////////////////////////////////////////////// 
   // Knobs and Buttons

   AppController.prototype.initUIControls = function(){
      this.UIElements = [];

      // Music Controls
      this.UIElements['seek'] = $('#seek').slider({
         step: 0.000001,
         min: 0,
         max: 1,
         value: 0,
         formater: function(value){
            value = value*600;

            var mins = Math.floor(value/60);
            if(mins < 10) mins = '0'+mins;

            var secs = Math.floor(value%60);
            if(secs < 10) secs = '0'+secs;

            return mins+':'+secs;
         },
         // tooltip: 'hide'
      }).on('slide', this.seek.bind(this));

      PD.bind('playhead', this.playhead.bind(this));
      $('#play').on('click', this.play.bind(this));
      $('#pause').on('click', this.pause.bind(this));

      this.volume = 0.6;
      PD.sendFloat(0.6, 'volume');
      this.UIElements['volume'] = new Knob({
         domElementId: 'volume',
         changingCallback: function(value, normalizedValue){
            this.volume = value;
            PD.sendFloat(value, 'volume');
         }.bind(this),
         value: 0.6,
         pow: 1,
         minValue: 0,
         maxValue: 1,
         width: '35px',
         height: '35px',
         speed: 5,
         spriteInitialAngle: 270,
      });

      // Space controls
      this.UIElements['room-size'] = $('#room-size').slider({
         step: 0.000001,
         min: 1,
         max: 10,
         value: 1,
         tooltip: 'hide'
      }).on('slide', this.changeRoomSize.bind(this));
      
      

      // Reverb
      this.UIElements['reverb-wet'] = new Knob({
         domElementId: 'reverb_wet',
         changingCallback: function(value, normalizedValue){
            PD.sendList(['wet', normalizedValue], 'reverb');
         },
         value: 0.5,
         width: '45px',
         height: '45px',
         speed: 5,
         spriteInitialAngle: 270,
         label: 'Wet'
      });
      PD.sendList(['wet'], 0.5, 'reverb');

      this.UIElements['reverb-dry'] = new Knob({
         domElementId: 'reverb_dry',
         changingCallback: function(value, normalizedValue){
            PD.sendList(['dry', normalizedValue], 'reverb');
         },
         value: 0.5,
         width: '45px',
         height: '45px',
         speed: 5,
         spriteInitialAngle: 270,
         label: 'Dry'
      });
      PD.sendList(['dry'], 0.5, 'reverb');

      this.UIElements['reverb-damping'] = new Knob({
         domElementId: 'reverb_damp',
         changingCallback: function(value, normalizedValue){
            PD.sendList(['damp', normalizedValue], 'reverb');
         },
         value: 0.5,
         width: '45px',
         height: '45px',
         speed: 5,
         spriteInitialAngle: 270,
         label: 'Damp'
      });
      PD.sendList(['damp'], 0.5, 'reverb');

      this.UIElements['reverb-size'] = new Knob({
         domElementId: 'reverb_size',
         changingCallback: function(value, normalizedValue){
            PD.sendList(['size', normalizedValue], 'reverb');
         },
         value: 0.5,
         width: '45px',
         height: '45px',
         speed: 5,
         spriteInitialAngle: 270,
         label: 'Size'
      });
      PD.sendList(['size'], 0.5, 'reverb');


      this.UIElements['reverb-fspread'] = new Knob({
         domElementId: 'reverb_fspread',
         changingCallback: function(value, normalizedValue){
            PD.sendList(['fspread', normalizedValue], 'reverb');
         },
         value: 0.5,
         width: '45px',
         height: '45px',
         speed: 5,
         spriteInitialAngle: 270,
         label: 'Early'
      });
      PD.sendList(['fspread'], 0.5, 'reverb');

      this.UIElements['reverb-spread'] = new Knob({
         domElementId: 'reverb_spread',
         changingCallback: function(value, normalizedValue){
            PD.sendList(['spread', normalizedValue], 'reverb');
         },
         value: 0.5,
         width: '45px',
         height: '45px',
         speed: 5,
         spriteInitialAngle: 270,
         label: 'Late'
      });
      PD.sendList(['spread'], 0.5, 'reverb');
   };

   AppController.prototype.changeRoomSize = function(e){
      var value = $(e.currentTarget).slider('getValue');
      this.roomSize = value;

      this.listener.update();

      this.roomSizeCircles[0].setRadius( this.stageWidth/2/this.roomSize );
      this.roomSizeCircles[1].setRadius( this.stageWidth/2/this.roomSize * 0.75 );
      this.roomSizeCircles[2].setRadius( this.stageWidth/2/this.roomSize * 0.5 );
         
      this.stage.renderAll();
   };

   AppController.prototype.play = function(e){
      PD.sendList(['resume'], 'play');
   };

   AppController.prototype.pause = function(e){
      PD.sendList(['stop'], 'play');
   };

   AppController.prototype.seek = function(e){
      this.seeking = true;
      clearTimeout(this.seekTimer);
      this.seekTimer = setTimeout(function(){
         var value = Number($(e.currentTarget).slider('getValue')) * 600;
         value = Math.round(value);
         PD.sendList(['seek', String(value)], 'play');
         this.seeking = false;
      }.bind(this),500);
   };

   AppController.prototype.playhead = function(msg){
      if(this.seeking){
         return; 
      }
      val = Number(msg)/600;
      $('#seek').slider('setValue', val);
   };
   
   ///////////////////////////////////////////////////////////////////////////////// 
   // Sound Sources

   AppController.prototype.initSources = function(){
      this.listener = new Listener({
         x: Math.floor(this.stageHeight/2),
         y: Math.floor(this.stageWidth/2),
         stage: this.stage,
         // canvasAmbisonics: this.ambisonics,
         parentController: this
      });

      this.sources= [];   
      for(var i=0; i<49; i++){
         this.sources.push(new Source({
            id: i+1,
            name: "Source " + (i+1),
            x: Math.random() * this.stageWidth,
            y: Math.random() * this.stageHeight,
            stage: this.stage,
            parentController: this
            // canvasAmbisonics: this.ambisonics,
         }));
      }

      $('#source-name').on('change input', this.setSelectedSourceName.bind(this));

   };

   AppController.prototype.didSelectSource = function(source){
      if(!source){
         $('#selected-source').hide();
         return;
      } 

      this.selectedSource = source;
      $('#selected-source-id').html(source.id);
      $('#source-name').val(source.name);
      $('#selected-source').show();
   };

   AppController.prototype.setSelectedSourceName = function(e){
      this.selectedSource.name = $(e.target).val();
   };

   ///////////////////////////////////////////////////////////////////////////////// 
   // Load & Save
   AppController.prototype.initLoadSave = function(){
      $('#save-btn').on('click', this.save.bind(this));
      $('#load-btn').on('click', this.load.bind(this));
   };

   AppController.prototype.save = function(e){
      DBMFile.showDialog("Save Preset", "*.bounces", false, "preset.bounces", function(params){
         var path = params['path'];
         var data = JSON.stringify( this.gatherParametersFromUI() );
         DBMFile.writeFile(path, data);
      }.bind(this));
   };

   AppController.prototype.load = function(e){
      DBMFile.showDialog("Load Preset", "*.bounces", true, "", function(params){
         var path = params['path'];
         DBMFile.readFile(path, function(params){
            var data = params['data'];
            data = JSON.parse(data);
            this.setParametersFromPreset(data);
         }.bind(this));
      }.bind(this));
   };

   AppController.prototype.gatherParametersFromUI = function() {
      var volume = this.UIElements['volume'].normalValue;
      var roomSize = this.UIElements['room-size'].slider('getValue');
      var reverbWet = this.UIElements['reverb-wet'].normalValue;
      var reverbDry = this.UIElements['reverb-dry'].normalValue;
      var reverbDamping = this.UIElements['reverb-damping'].normalValue;
      var reverbSize = this.UIElements['reverb-size'].normalValue;
      var reverbFSpread = this.UIElements['reverb-fspread'].normalValue;
      var reverbSpread = this.UIElements['reverb-spread'].normalValue;
      
      var srcs={};
      for(var i in this.sources){
         var source = this.sources[i];
         srcs[source.id] = {
            y: source.y / this.stageHeight,
            x: source.x / this.stageWidth,
            name: source.name,
            id: source.id
         };
      }

      var data = {
         'volume': volume,
         'room-size': roomSize,
         'reverb-wet': reverbWet,
         'reverb-dry': reverbDry,
         'reverb-damping': reverbDamping,
         'reverb-size': reverbSize,
         'reverb-fspread': reverbFSpread,
         'reverb-spread': reverbSpread,
         'sources': srcs
      }

      return data;
   };

   AppController.prototype.setParametersFromPreset = function(data) {
      this.UIElements['volume'].setValue(data['volume']);
      this.volume = data['volume'];
      PD.sendFloat(this.volume, 'volume');

      this.UIElements['reverb-wet'].setValue(data['reverb-wet']);
      PD.sendList(['wet', data['reverb-wet']], 'reverb');

      this.UIElements['reverb-dry'].setValue(data['reverb-dry']);
      PD.sendList(['dry', data['reverb-dry']], 'reverb');

      this.UIElements['reverb-damping'].setValue(data['reverb-damping']);
      PD.sendList(['damp', data['reverb-damping']], 'reverb');

      this.UIElements['reverb-size'].setValue(data['reverb-size']);
      PD.sendList(['size', data['reverb-size']], 'reverb');

      this.UIElements['reverb-fspread'].setValue(data['reverb-fspread']);
      PD.sendList(['fspread', data['reverb-fspread']], 'reverb');

      this.UIElements['reverb-spread'].setValue(data['reverb-spread']);
      PD.sendList(['spread', data['reverb-spread']], 'reverb');


      this.UIElements['room-size'].slider('setValue', data['room-size']);
      this.roomSize = data['room-size'];
      this.roomSizeCircles[0].setRadius( this.stageWidth/2/this.roomSize );
      this.roomSizeCircles[1].setRadius( this.stageWidth/2/this.roomSize * 0.75 );
      this.roomSizeCircles[2].setRadius( this.stageWidth/2/this.roomSize * 0.5 );

      for(var i in data['sources']){
         var sourceData = data['sources'][i];
         var source = this.sources[Number(i)-1];
         source.x = sourceData['x'] * this.stageWidth;
         source.y = sourceData['y'] * this.stageHeight;
         source.name = sourceData['name'];
         // source.id = sourceData['id'];
         source.update();
      }

      this.stage.renderAll();
   };

   /////////////////////////////////////////////////////////////////////////////////
   // Arrow keys
   AppController.prototype.initArrowKeys = function(){
      $(document).on('keydown', this.keydown.bind(this));
   };

   AppController.prototype.keydown = function(e){
      var Q = 81;
      var W = 87;
      var E = 69;
      var A = 65;
      var S = 83;
      var D = 68 ;

      if(e.which==Q){
         this.listener.angle -= 5;
         this.listener.update();
      }
      else if(e.which==E){
         this.listener.angle += 5; 
         this.listener.update();
      }
      else if(e.which==W){
         this.listener.y -= 5;
         this.listener.update();
      }
      else if(e.which==S){
         this.listener.y += 5;
         this.listener.update();
      }
      else if(e.which==A){
         this.listener.x -= 5;
         this.listener.update();
      }
      else if(e.which==D){
         this.listener.x += 5;
         this.listener.update();
      }
   };

   ///////////////////////////////////////////////////////////////////////////////// 
   // Sound Output
   AppController.prototype.initSoundOutputControls = function(){
      this.speakerConfigVisible = false;
      $('.sound-output input:radio').on('change', this.radioSpeakersChanged.bind(this));
      $('#configure-speakers-btn').on('click', this.configureSpeakersBtnClicked.bind(this));
      $('#speaker-fl, #speaker-fr, #speaker-bl, #speaker-br').on('click', this.clickedSpeaker.bind(this));
   };

   AppController.prototype.clickedSpeaker = function(e){
      var whichSpeaker = $(e.currentTarget).attr('id');
      PD.sendList([whichSpeaker], 'speaker_test');
   };

   AppController.prototype.radioSpeakersChanged = function(e){
      var value = $(e.currentTarget).val();
      if(value==4){
         $('#configure-speakers-btn').show();
      }
      else{
         $('#configure-speakers-btn').hide();
         this.hideSpeakerConfig();
         this.speakerConfigVisible = false;
      }
   };

   AppController.prototype.configureSpeakersBtnClicked = function(e){
      if(this.speakerConfigVisible){
         this.hideSpeakerConfig();
         this.speakerConfigVisible = false;
      }
      else{
         this.showSpeakerConfig();
         this.speakerConfigVisible = true;
      }
   };

   AppController.prototype.showSpeakerConfig = function(){
      PD.sendList(['stop'], 'play');
      $('#configure-speakers-btn a').html('Done configuring speakers.');
      $('.selected-source.controls').hide();
      $('.reverb.controls').hide();
      $('.space.controls').hide();
      $('.music.controls').hide();
      $('#configure-speakers').show();
   };

   AppController.prototype.hideSpeakerConfig = function(){
      $('#configure-speakers-btn a').html('Configure speakers.');
      $('.selected-source.controls').show();
      $('.reverb.controls').show();
      $('.space.controls').show();
      $('.music.controls').show();
      $('#configure-speakers').hide();
   };

   return AppController;
});
