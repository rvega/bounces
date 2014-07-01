define(['./Listener', './Source', 'vendors/oss/knob/knob', 'vendors/oss/slider/slider'], function(Listener, Source, Knob, Slider){

   NO_PD = false;
   // NO_PD = true;

   var AppController = function(){
      this.initStage();
      this.initArrowKeys();
      this.initSoundOutputControls();
      this.initCredits();
      
      this.initPD(function(){
         this.initUIControls();
         this.initSources();
         this.initLoadSave();
         this.initSoundLevels();
         $('#main').show();
         $('#loading').hide();
         this.loadDefaultPreset();
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
      PD.start({
         patch:'sound-space-no-gui.pd',
         outChannels: 4
      },function(params){
         callback();
      }, function(err){
          console.log(err);
      });
   };

   AppController.prototype.bindPDMessages = function(){
      PD.bind('playhead', this.playhead.bind(this));
      PD.bind('levels',this.receivedSoundLevels.bind(this)); 
   }

   ///////////////////////////////////////////////////////////////////////////////// 
   // Credits
   AppController.prototype.initCredits = function(){
      $('#open-credits-btn').on('click', this.openCredits.bind(this));
      $('#close-credits-btn').on('click', this.closeCredits.bind(this));
   },

   AppController.prototype.openCredits = function(){
      $('#credits-popup').show();
   },

   AppController.prototype.closeCredits = function(){
      $('#credits-popup').hide();
   },
   
   ///////////////////////////////////////////////////////////////////////////////// 
   // Stage 


   AppController.prototype.initStage = function(){
      this.stageWidth = 600;
      this.stageHeight = 600;

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

      this.drawDiagonalLines();
   };

   AppController.prototype.drawDiagonalLines = function(){
      var opts = {
         stroke: '#AAA',
         selectable: false
      }
      var line1 = new fabric.Line([], opts);
      line1.left = 0;
      line1.top = 230;
      line1.width = 370;
      line1.height = 600-230;
      this.stage.add(line1);

      var line2 = new fabric.Line([], opts);
      line2.left = 0;
      line2.top = 65;
      line2.width = 560;
      line2.height = 600-65;
      this.stage.add(line2);

      var line3 = new fabric.Line([], opts);
      line3.left = 155;
      line3.top = 0;
      line3.width = 600-155;
      line3.height = 445;
      this.stage.add(line3);

      var line4 = new fabric.Line([], opts);
      line4.left = 345;
      line4.top = 0;
      line4.width = 600-345;
      line4.height = 250;
      this.stage.add(line4);
   };

   ///////////////////////////////////////////////////////////////////////////////// 
   // Knobs and Buttons

   AppController.prototype.initUIControls = function(){
      this.playheadPosition = 0;
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
         min: 1,
         max: 10,
         value: 1,
         step: 0.01,
         tooltip: 'show',
         formater: function(value){
            return value.toFixed(2);
         }
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
      if(this.playheadPosition==0 || this.playheadPosition==596){
         PD.sendList(['resume'], 'play');
      }
      else{
         PD.sendList(['start'], 'play');
      }
   };

   AppController.prototype.pause = function(e){
      PD.sendList(['stop'], 'play');
   };

   AppController.prototype.seek = function(e){
      this.seeking = true;
      clearTimeout(this.seekTimer);
      this.seekTimer = setTimeout(function(){
         var value = Number($(e.currentTarget).slider('getValue')) * 600;
         this.playheadPosition = value;
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

      this.listener = new Listener({
         x: Math.floor(this.stageHeight/2),
         y: Math.floor(this.stageWidth/2),
         stage: this.stage,
         // canvasAmbisonics: this.ambisonics,
         parentController: this
      });


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
   AppController.prototype.loadDefaultPreset = function(){
      var path = 'html/presets/bounces.bounces';
      DBMFile.readFile(path, function(params){
         var data = params['data'];
         data = JSON.parse(data);
         this.setParametersFromPreset(data);
      }.bind(this));
   };

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
      this.timerCounter=0;
      this.moving = false;
      this.rotating = false;
      this.linearSpeed = 0;
      this.angularSpeed = 0;
      this.movementTimer = 0;
      $(document).on('keydown', this.keydown.bind(this));
      $(document).on('keyup', this.keyup.bind(this));
   };

   AppController.prototype.keyup = function(e){
      var LEFT = 37;
      var UP = 38;
      var RIGHT = 39;
      var DOWN = 40;

      if(e.which==UP || e.which==DOWN){
         this.moving=false;
      }
      if(e.which==LEFT || e.which==RIGHT){
         this.rotating=false;
      }

      if(e.which==UP || e.which==DOWN || e.which==LEFT || e.which==RIGHT){
         this.timerCounter=0;
         return false;
      }
      else{
         return true;
      }
   };

   AppController.prototype.keydown = function(e){
      // return;
      var LEFT = 37;
      var UP = 38;
      var RIGHT = 39;
      var DOWN = 40;

      if(e.which==UP && !this.moving){
         this.linearSpeed = -2;
         this.moving=true;
      }
      else if(e.which==DOWN && !this.moving){
         this.linearSpeed = 2;
         this.moving=true;
      }
      else if(e.which==LEFT && !this.rotating){
         this.angularSpeed = -5;
         this.rotating=true;
      }
      else if(e.which==RIGHT && !this.rotating){
         this.angularSpeed = 5;
         this.rotating=true;
      }

      if(e.which==UP || e.which==DOWN || e.which==LEFT || e.which==RIGHT){
         if(this.movementTimer==0){
            // this.movementTimer = setInterval(this.movementLoop.bind(this),60);
            this.movementTimer = window.requestAnimationFrame(this.movementLoop.bind(this));
            this.timerCounter=0;
         }

         return false;
      }
      else{
         return true;
      }
   };

   AppController.prototype.movementLoop = function(e){
      var angle = (-1*this.listener.angle + 90) * Math.PI/180;
      this.listener.x -= this.linearSpeed*Math.cos(angle);
      this.listener.y += this.linearSpeed*Math.sin(angle);

      if(this.listener.x <= 0){
         this.listener.x = 0;
      }
      if(this.listener.y <= 0){
         this.listener.y = 0;
      }
      if(this.listener.y > this.stageHeight){
         this.listener.y=this.stageHeight;
      }
      if(this.listener.x > this.stageWidth){
         this.listener.x=this.stageWidth;
      }


      this.listener.angle += this.angularSpeed;

      if(!this.moving){
         var linearAcceleration = 0.9;
         this.linearSpeed = this.linearSpeed*linearAcceleration;
      }
      else{
         var sign = this.linearSpeed > 0 ? 1 : -1;
         var maxSpeed = 10;
         var accel = 1.1;
         this.linearSpeed = sign * Math.min(Math.abs(this.linearSpeed*accel), maxSpeed);
         // console.error(this.linearSpeed);
         
         // this.timerCounter = this.timerCounter+1; 
         // if(this.timerCounter == 30){
         // }
      }

      if(!this.rotating){
         var angularAcceleration = 0.8;
         this.angularSpeed = this.angularSpeed*angularAcceleration;
      }


      if(Math.abs(this.linearSpeed)<0.01 && Math.abs(this.angularSpeed)<0.01){
         // clearInterval(this.movementTimer);
         this.movementTimer=0;
      }
      else{
         window.requestAnimationFrame(this.movementLoop.bind(this));
      }

      this.listener.update();
   };

   ///////////////////////////////////////////////////////////////////////////////// 
   // Sound Levels
   AppController.prototype.initSoundLevels = function(){
      PD.bind('levels',this.receivedSoundLevels.bind(this)); 
   };

   AppController.prototype.receivedSoundLevels = function(value){
      value = value.split(" ");
      for(var i=0; i<value.length-1; i++){
         var source = this.sources[i];
         source.setLevel(value[i]);
      }
      this.stage.renderAll();
   }

   ///////////////////////////////////////////////////////////////////////////////// 
   // Sound Output Options
   AppController.prototype.initSoundOutputControls = function(){
      this.audioDevices = {};

      PD.getAudioDevices(function(devices){
         this.audioDevices = {};
         devices = devices['devices'];
         for(var i=0; i<devices.length; i++){
            var device = devices[i];
            
            if(device.outputChannels == 0){
               continue;
            }
   
            var apiName = "";
            if(device.api == "CORE") apiName="";
            else if(device.api == "DS") apiName="";
            else if(device.api == "ASIO") apiName=" (Asio) ";

            var value = device.api + ":" + device.id; 
            var string = device.name + apiName; 
            var html = '<option value="'+ value +'">'+ string +'</option>';
            $('#sound-devices').append(html);

            this.audioDevices[value] = device;
         }

         PD.getDefaultOutputDevice(function(device){
            var value = device.api + ":" + device.id; 
            $('#sound-devices').val(value);

            var channels = device.outputChannels >= 4 ? 4 : 2;
            if(channels==4){
               $('#num_channels_4').removeAttr('disabled');
            }
            else{
               $('#num_channels_2').click();
               $('#num_channels_4').attr('disabled', true);
            }
         })
      }.bind(this));

      this.soundConfigVisible = false;
      $('#sound-devices').on('change', this.changeSoundDevice.bind(this));
      $('#show-output-config-btn').on('click', this.showOutputConfigBtnClicked.bind(this));
      $('.sound-output input:radio').on('change', this.radioSpeakersChanged.bind(this));
      $('#speaker-fl, #speaker-fr, #speaker-bl, #speaker-br').on('click', this.clickedSpeaker.bind(this));
   };

   AppController.prototype.changeSoundDevice = function(e){
      var deviceId = $(e.currentTarget).val();
      var device = this.audioDevices[deviceId];
      var channels = device.outputChannels >= 4 ? 4 : 2;

      if(channels==4){
         $('#num_channels_4').removeAttr('disabled');
      }
      else{
         $('#num_channels_2').click();
         $('#num_channels_4').attr('disabled', true);
      }

      var self = this;
      PD.stop(function(){
         PD.start({
            patch:'sound-space-no-gui.pd',
            outChannels: channels,
            outDevice: deviceId,
         },function(params){
            self.bindPDMessages();
            var data = self.gatherParametersFromUI();
            self.setParametersFromPreset(data);
         },function(err){
            console.log(err);
         });
      }, function(err){
         console.log(err);
      });
   };

   AppController.prototype.showOutputConfigBtnClicked = function(e){
      if(this.soundConfigVisible){
         this.soundConfigVisible = false;
         this.hideOutputConfig();
      }
      else{
         this.soundConfigVisible = true;
         this.showOutputConfig();
      }
   };

   AppController.prototype.showOutputConfig = function(){
      $('#sound-output-config').show();
      $('#show-output-config-btn').html('Hide sound output controls.');
      $('.selected-source.controls').hide();
      $('.reverb.controls').hide();
      $('.space.controls').hide();
      $('.music.controls').hide();
   };

   AppController.prototype.hideOutputConfig = function(){
      $('#sound-output-config').hide();
      $('#show-output-config-btn').html('Show sound output controls.');
      $('.selected-source.controls').show();
      $('.reverb.controls').show();
      $('.space.controls').show();
      $('.music.controls').show();
   };
  
   AppController.prototype.radioSpeakersChanged = function(e){
      var value = $(e.currentTarget).val();
      if(value==4){
         PD.sendFloat(1, 'quadraphonic');
      }
      else{
         PD.sendFloat(0, 'quadraphonic');
      }
   };

   AppController.prototype.clickedSpeaker = function(e){
      var whichSpeaker = $(e.currentTarget).attr('id');
      var message;
      if(whichSpeaker=='speaker-fl'){
         message = '0';
      }
      if(whichSpeaker=='speaker-fr'){
         message = '1';
      }
      if(whichSpeaker=='speaker-bl'){
         message = '2';
      }
      if(whichSpeaker=='speaker-br'){
         message = '3';
      }
      PD.sendFloat(message, 'test');
      PD.sendList(['stop'], 'play');
   };

   return AppController;
});
