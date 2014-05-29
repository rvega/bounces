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
      var self=this;
      this.view = fabric.Image.fromURL('styles/img/head.png',function(image){
         image.set({
            width: 131/3,
            height: 139/3,
            left: self.x,
            top: self.y,
            originX: 'center',
            originY: 'center',
            lockScalingX: true,
            lockScalingY: true,
            hasControls: false,
            borderColor: '#F00',
            cornerColor: '#F00',
            cornerSize: 8
         });

         image.on('moving', function(e){self.modified.call(self, this, e)});
         image.on('rotating', function(e){self.modified.call(self, this, e)});
         image.on('selected', function(e){self.selected.call(self, this, e)});
         self.stage.add(image);
      });

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

   Listener.prototype.update = function(){
      this.view.set({
         left: this.x,
         top: this.y,
         angle: this.angle
      });

      var e = new CustomEvent('LISTENER_CHANGED',{
         'detail':this
      });
      document.dispatchEvent(e);

      this.view.setCoords();
      this.stage.renderAll();
   };

   
   return Listener;
});
