define(function(){
   /** 
    * The Listener Constructor
    * @constructor
    */
   var Listener = function(params){
      var p = params || {};

      this.parentController = p.parentController;
      this.stage = p.stage;
      // this.canvasAmbisonics = p.canvasAmbisonics;

      this.x = p.x || 0;
      this.y = p.y || 0;
      this.angle = p.angle || 0;

      this.initView();
   };

   Listener.prototype.initView = function(){
      this.view = new fabric.Triangle({
         width: 20,
         height: 25,
         left: this.x,
         top: this.y,
         originX: 'center',
         originY: 'center',
         lockScalingX: true,
         lockScalingY: true,
         hasControls: false,
         borderColor: '#F00',
         cornerColor: '#F00',
         fill: '#1b571a',
         cornerSize: 8
      });
      var self=this;
      this.view.on('moving', function(e){self.modified.call(self, this, e)});
      this.view.on('rotating', function(e){self.modified.call(self, this, e)});
      this.view.on('selected', function(e){self.selected.call(self, this, e)});
      this.stage.add(this.view);

      // this.viewAmbisonics = new fabric.Circle({
      //    radius: 8,
      //    left: this.x,
      //    top: this.y,
      //    originX: 'center',
      //    originY: 'center',
      //    lockScalingX: true,
      //    lockScalingY: true
      // });
      // this.canvasAmbisonics.add(this.viewAmbisonics);
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

   Listener.prototype.selected = function(object, event){
      this.parentController.didSelectSource(null);
   };
   
   return Listener;
});
