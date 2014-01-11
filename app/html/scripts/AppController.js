define(['./Listener', './Source'], function(Listener, Source){
   var AppController = function(){
      this.canvasWidth = 250;
      this.canvasHeight = 250;

      this.initStages();
      this.initListener();
      this.initSources();
   };

   AppController.prototype.initSources = function(){
      this.sources = [];   

      this.sources.push(new Source({
         x: 10,
         y: 60,
         canvasStage: this.stage,
         canvasAmbisonics: this.ambisonics,
         parentController: this
      }));

      this.sources.push(new Source({
         x: 60,
         y: 60,
         canvasStage: this.stage,
         canvasAmbisonics: this.ambisonics,
         parentController: this
      }));

      this.sources.push(new Source({
         x: 35,
         y: 80,
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
