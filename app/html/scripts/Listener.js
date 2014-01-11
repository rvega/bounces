define(function(){
   /** 
    * The Listener Constructor
    * @constructor
    */
   var Listener = function(params){
      var p = params || {};

      this.parentController = p.parentController;
      this.canvasStage = p.canvasStage;
      this.canvasAmbisonics = p.canvasAmbisonics;

      this.x = p.x || 0;
      this.y = p.y || 0;
      this.angle = p.angle || 0;

      this.initView();
   };

   Listener.prototype.initView = function(){
      this.viewStage = new fabric.Circle({
         radius: 8,
         left: this.x,
         top: this.y,
         originX: 'center',
         originY: 'center',
         lockScalingX: true,
         lockScalingY: true
      });
      var self=this;
      this.viewStage.on('moving', function(e){self.modified.call(self, this, e)});
      this.viewStage.on('rotating', function(e){self.modified.call(self, this, e)});
      this.canvasStage.add(this.viewStage);

      this.viewAmbisonics = new fabric.Circle({
         radius: 8,
         left: this.x,
         top: this.y,
         originX: 'center',
         originY: 'center',
         lockScalingX: true,
         lockScalingY: true
      });
      this.canvasAmbisonics.add(this.viewAmbisonics);
   };

   Listener.prototype.modified = function(object, event){
      this.angle = object.angle;
      this.y = object.top;
      this.x = object.left;
      var e = new CustomEvent('LISTENER_CHANGED',{
         'detail':this
      });
      document.dispatchEvent(e);
   };
   
   return Listener;
});
