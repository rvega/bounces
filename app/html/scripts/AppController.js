define(['./Listener', './Source', 'vendors/oss/knob/knob', 'vendors/oss/slider/slider'], function(Listener, Source, Knob, Slider){
   var AppController = function(){
      this.canvasWidth = 600;
      this.canvasHeight = 600;

      this.initStages();
      this.initListener();
      // this.initPD(function(){
         this.initSources();
      // }.bind(this));
   };

   AppController.prototype.initPD = function(callback){
      // Init PureData engine and load synth.pd patch.
      PD.configurePlayback(44100, 2, false, false, function(){
         PD.openFile('pd/patches', 'amb.pd', function(){
            PD.setActive(true);
            callback();
         });
      });
   };

   AppController.prototype.initSources = function(){
      this.sources = [];   

      this.sources.push(new Source({
         id: 0,
         x: 10,
         y: 10,
         canvasStage: this.stage,
         canvasAmbisonics: this.ambisonics,
         parentController: this
      }));

      this.sources.push(new Source({
         id: 1,
         x: 240,
         y: 10,
         canvasStage: this.stage,
         canvasAmbisonics: this.ambisonics,
         parentController: this
      }));

      this.sources.push(new Source({
         id: 2,
         x: 10,
         y: 240,
         canvasStage: this.stage,
         canvasAmbisonics: this.ambisonics,
         parentController: this
      }));

      this.sources.push(new Source({
         id: 3,
         x: 240,
         y: 240,
         canvasStage: this.stage,
         canvasAmbisonics: this.ambisonics,
         parentController: this
      }));
   };

   AppController.prototype.initListener = function(){
      this.listener = new Listener({
         x: Math.floor(this.canvasHeight/2),
         y: Math.floor(this.canvasWidth/2),
         canvasStage: this.stage,
         canvasAmbisonics: this.ambisonics,
         parentController: this
      });
   };

   AppController.prototype.initStages = function(){
      $('#seek').slider({
         step: 0.000001,
         min: 0,
         max: 1,
         value: 0,
         tooltip: 'hide'
      });

      var volume = new Knob({
         domElementId: 'volume',
         changingCallback: function(value, normalizedValue){
            console.log('vol');
         },
         value: 0.6,
         pow: 1,
         minValue: 0,
         maxValue: 1,
         width: '30px',
         height: '30px',
         speed: 10,
         spriteInitialAngle: 270,
      });
      
      $('#canvas-stage').attr('width', this.canvasWidth).attr('height', this.canvasHeight);
      this.stage = new fabric.Canvas('canvas-stage',{
         backgroundColor: '#AAA'
      });

      $('#canvas-ambisonics').attr('width', this.canvasWidth).attr('height', this.canvasHeight);
      this.ambisonics = new fabric.StaticCanvas('canvas-ambisonics',{
         backgroundColor: '#AAA'
      });
   };
   
   return AppController;
});
