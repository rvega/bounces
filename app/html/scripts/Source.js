define(function(){
   /** 
    * The Source Constructor
    * @constructor
    */
   var Source = function(params){
      var p = params || {};

      this.id = p.id;
      this.parentController = p.parentController;
      this.canvasStage = p.canvasStage;
      this.canvasAmbisonics = p.canvasAmbisonics;

      this.x = p.x || 0;
      this.y = p.y || 0;

      this.initView();
      document.addEventListener('LISTENER_CHANGED', this.redrawInAmbisonicsSpace.bind(this));

   };

   Source.prototype.initView = function(){
      this.viewStage = new fabric.Circle({
         radius: 8,
         left: this.x,
         top: this.y,
         originX: 'center',
         originY: 'center',
         lockScalingX: true,
         lockScalingY: true,
         fill: '#00A'
      });
      var self = this;
      this.viewStage.on('moving', function(e){self.modified.call(self, this, e)});
      this.canvasStage.add(this.viewStage);

      this.viewAmbisonics = new fabric.Circle({
         radius: 8,
         left: this.x,
         top: this.y,
         originX: 'center',
         originY: 'center',
         fill: '#00A'
      });
      this.canvasAmbisonics.add(this.viewAmbisonics);
   };

   Source.prototype.modified = function(object, event){
      this.y = object.top;
      this.x = object.left;
      this.redrawInAmbisonicsSpace(); 
   };
   
   Source.prototype.redrawInAmbisonicsSpace = function(e){
      var listener = this.parentController.listener;

      // Three 2D transforms here by means of matrix multiplication (dot product).
      // http://en.wikipedia.org/wiki/Transformation_matrix
      //
      // First, move the origin to the listener's position:
      //     transform = [[1, 0, (-1*listener.x)],
      //                  [0, 1, (-1*listener.y)],
      //                  [0, 0, 1]];
      //
      // Second, rotate around the origin:
      //    transform = [[Math.cos(angle), Math.sin(angle), 0],
      //                 [-Math.sin(angle), Math.cos(angle), 0],
      //                 [0, 0, 1]];
      //
      // Third, move the origin back to the center of the canvas:
      //    transform = [[1, 0, (this.canvasAmbisonics.getCenter().left)],
      //                 [0, 1, (this.canvasAmbisonics.getCenter().top)],
      //                 [0, 0, 1]];
      //
      // By multiplying these three matrices, I got the one used below 
      // (matrix dot product is associative)

      var point = [[this.x],[this.y],[1]];
      var angle = listener.angle*Math.PI/180;
      var cos = Math.cos(angle);
      var sin = Math.sin(angle);
      var t1x = -1*listener.x;
      var t1y = -1*listener.y;
      var t2x = this.canvasAmbisonics.getCenter().left;
      var t2y = this.canvasAmbisonics.getCenter().top;

      var transform = [[cos, sin, cos*t1x + sin*t1y + t2x],
                       [-sin, cos, -sin*t1x + cos*t1y + t2y],
                       [0, 0, 1]];
      point = numeric.dot(transform, point);

      this.viewAmbisonics.set({left:point[0][0], top:point[1][0]});
      this.canvasAmbisonics.renderAll();
      this.notifyPD(point[0][0], point[1][0]);
   };

   Source.prototype.notifyPD = function(x, y){
      // PD ambisonics library uses coordinates in [-1, 1] 
      var newX = (8*x / this.canvasAmbisonics.getWidth())-4;
      var newY = (-8*y / this.canvasAmbisonics.getHeight())+4;

      var message = this.id + " car " + newX + " " + newY;
      message = message.split(' ');
      // var message = "sourc2323";
      PD.sendList(message, 'from-gui');
   };

   return Source;
});
