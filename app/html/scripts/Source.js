define(function(){
   /** 
    * The Source Constructor
    * @constructor
    */
   var Source = function(params){
      var p = params || {};

      this.id = p.id;
      this.name = p.name;
      this.parentController = p.parentController;
      this.stage = p.stage;
      // this.canvasAmbisonics = p.canvasAmbisonics;

      this.x = p.x || 0;
      this.y = p.y || 0;

      this.initView();
      document.addEventListener('LISTENER_CHANGED', this.calculateAmbisonicsSpacePosition.bind(this));

   };

   Source.prototype.initView = function(){
      this.view = new fabric.Text('X', {
         fontFamily: 'Arial',
         fontSize: 14,
         fontWeight: 'bold',
         left: this.x,
         top: this.y,
         originX: 'center',
         originY: 'center',
         lockScalingX: true,
         lockScalingY: true,
         fill: '#222',
         hasControls: false,
         hasRotatingPoint: false,
         borderColor: '#F00',
         cornerColor: '#F00',
         cornerSize: 0
      });
      this.view.source = this;
      
      var self = this;
      this.view.on('selected', function(e){self.selected.call(self, this, e)});
      this.stage.add(this.view);

      // this.viewAmbisonics = new fabric.Circle({
      //    radius: 8,
      //    left: this.x,
      //    top: this.y,
      //    originX: 'center',
      //    originY: 'center',
      //    fill: '#00A'
      // });
      // this.canvasAmbisonics.add(this.viewAmbisonics);
   };

   Source.prototype.selected = function(object, event){
      this.parentController.didSelectSource(this);
   };

   Source.prototype.modified = function(_x, _y){
      this.x = _x;
      this.y = _y;
      this.calculateAmbisonicsSpacePosition();
   };
   
   Source.prototype.calculateAmbisonicsSpacePosition = function(e){
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
      var t2x = this.stage.getCenter().left;
      var t2y = this.stage.getCenter().top;
      // var t2x = this.canvasAmbisonics.getCenter().left;
      // var t2y = this.canvasAmbisonics.getCenter().top;

      var transform = [[cos, sin, cos*t1x + sin*t1y + t2x],
                       [-sin, cos, -sin*t1x + cos*t1y + t2y],
                       [0, 0, 1]];
      point = numeric.dot(transform, point);

      // this.viewAmbisonics.set({left:point[0][0], top:point[1][0]});
      // this.canvasAmbisonics.renderAll();
      this.notifyPD(point[0][0], point[1][0]);
   };

   Source.prototype.notifyPD = function(x, y){
      // PD ambisonics library uses coordinates in [-1, 1] 
      var roomSize = this.parentController.roomSize;
      var newX = (2*roomSize*x / this.stage.getWidth())-(roomSize);
      var newY = (-2*roomSize*y / this.stage.getHeight())+(roomSize);

      var message = (this.id-1) + " car " + newX + " " + newY;
      message = message.split(' ');
      PD.sendList(message, 'positions');
   };

   Source.prototype.update = function(){
      this.view.set({
         left: this.x,
         top: this.y
      })
      this.view.setCoords();
      this.calculateAmbisonicsSpacePosition();
   };

   return Source;
});
