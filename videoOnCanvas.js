// In this code we will directly draw the webcam stream on a canvas.
// This was intended to be called from Jens Mönig's morphic.js
// If you however want to use this in a plain webpage, uncomment the 
// code strip below, insert the whole code into a <script> tag and create 
// a single <canvas> object on the page:
/*window.onload = function(){
  var ctx = document.getElementsByTagName('canvas')[0].getContext('2d')
  var myvideoOnCanvas = new videoOnCanvas(ctx, drawVideoOnCanvasFunction)
}*/



/* ========================================================================== *
 * The videoOnCanvas.js WebRTC Video library
 *
 * Partially based upon code by:
 * Basic structure: Claudio Brandolino - https://github.com/cbrandolino/camvas
 * Error handling: Achal Dave - http://stackoverflow.com/users/1291812/achal-dave / http://jsfiddle.net/9aT63/6/
 * Some ideas: Wolfram Hempel - https://github.com/WolframHempel/photobooth-js
 * Simple WebRTC examples on the web - http://en.wikipedia.org/wiki/WebRTC
 * 
 * The snap-custom.html page also uses MikeMayer's lightweight URL argument and 
 * parameter parser in order to allow custom Snap Process scheduler calls.
 * https://github.com/MikeMayer/arg.js
 *
 * IMPORTANT: For this code to work properly, there are changes that have to
 * be made to the StageMorph.prototype.drawNew method in the objects.js file
 * of the Snap! library. 
 *
 * Aldo von Wangenheim
 * http://www.computacaonaescola.ufsc.br/
 * October 2014
 * ========================================================================== */

// Browser Compatibility Equivalences.......
window.URL = window.URL || window.webkitURL

navigator.getUserMedia  = navigator.getUserMedia || 
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia || 
                          navigator.msieGetUserMedia ||
						  navigator.msGetUserMedia

window.requestAnimationFrame = window.requestAnimationFrame ||
                               window.webkitRequestAnimationFrame ||
                               window.mozRequestAnimationFrame ||
                               window.msRequestAnimationFrame ||
                               window.oRequestAnimationFrame

window.cancelAnimationFrame =  window.cancelAnimationFrame ||
                               window.webkitCancelAnimationFrame ||
                               window.mozCancelAnimationFrame ||
                               window.oCancelAnimationFrame

/* ------------------------------------------------------------------------- *
 *  The drawVideoOnCanvasFunction is called with three parameters: 
 *  - video: the video
 *  - deltaT: the timespan since the last time it was called and
 *  - canvasContext: the 2D context of the canvas where the video is to be rendered on.
 *
 * Aldo von Wangenheim
 * http://www.computacaonaescola.ufsc.br/
 * October 2014
 * -------------------------------------------------------------------------- */

function drawVideoOnCanvasFunction(video, deltaT, canvasContext) {
	 try {
		// The video should fill out all of the canvas -> only works if drawing is performed
		// with explicit height and width parameters.
		// Based upon an example in http://jsfiddle.net/m1erickson/MLGr4/
		canvasContext.drawImage(video, 0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
	} catch (e) {
		if (e.name == "NS_ERROR_NOT_AVAILABLE" || e.name == "TypeError") {
			// If error was "NS_ERROR_NOT_AVAILABLE", wait a bit before trying again - camera is not ready yet; 
			// Is necessary for the Logitech Orbit with the Phillips chipset.
			// Is NOT necessary for the Microsoft VX 3000 webcam.
			// A "TypeError" occurs regularly... some cameras appear to be sending mishappen or NULL frames sometimes.
			// This code handles both by waiting for them to pass. Other errors are thrown.
			setTimeout(drawVideoOnCanvasFunction, 100);
		} else {
			alert("VideoOnCanvas: Some error that I could not handle occurred:" + e);
			throw e;
		}
	}  
  } // end drawVideoOnCanvasFunction


/* ------------------------------------------------------------------------- *
 *  This function takes a 2D canvas context and a `drawVideoFunction`, which
 *  happens to be the drawVideoOnCanvasFunction declared above...
 *
 * Aldo von Wangenheim
 * http://www.computacaonaescola.ufsc.br/
 * October 2014
 * -------------------------------------------------------------------------- */
function videoOnCanvas(morphContext, drawVideoFunction) {
  var self = this
  this.canvasContext = morphContext.image.getContext('2d'); // I'm passing the whole StageMorph to be able to "change" it.
  this.drawOnCanvas = drawVideoFunction

  // We can't `new Video()` yet, so we'll resort to the vintage
  // "hidden div" hack for dynamic loading.
  // var streamContainer = this.canvasContext.canvas;
  // var streamContainer = document.createElement('div');
  
  /*streamContainer.setAttribute('width', this.canvasContext.canvas.width);
  streamContainer.setAttribute('height', this.canvasContext.canvas.height);*/
  
  this.video = document.createElement('video');
  this.video.setAttribute('id', 'camera');

  // If we don't do this, the stream will not be played.
  // Play and pause controls should work as usual 
  // for streamed videos.
  this.video.setAttribute('autoplay', '1');

  // The video should fill out all of the canvas -> This here does not work
  this.video.setAttribute('width', this.canvasContext.canvas.width);
  this.video.setAttribute('height', this.canvasContext.canvas.height);
  
  console.log("Width: " + this.canvasContext.canvas.width+"px");
  console.log("Height: " + this.canvasContext.canvas.height+"px");
  
  var videoConstraints = {
  video: {
    mandatory: {
      width: this.canvasContext.canvas.width,
      weight: this.canvasContext.canvas.height
    }
  }
};
  
  this.video.setAttribute('style', 'display:none');
  this.video.setAttribute('style', 'width:'+this.canvasContext.canvas.width);
  this.video.setAttribute('style', 'height:'+this.canvasContext.canvas.height);
  //streamContainer.appendChild(this.video);
  //document.body.appendChild(streamContainer);

  // The callback happens when we are starting to stream the video.
  //navigator.getUserMedia({video: true}, function(stream) {
  navigator.getUserMedia(videoConstraints, function(stream) {
    // Yay, now our webcam input is treated as a normal video and
    // we can start having fun with Scratch/SNAP!
    self.video.src = window.URL.createObjectURL(stream)
    // Let's start drawing the video output on the canvas!
    self.update()
  }, videoOnCanvasError);
  // Let the StageMorph know which is its video instance
  console.log("morphContext isA: " + morphContext.constructor.name);
  morphContext.video = this.video;

  // As soon as we can draw a new frame on the canvas, we call the `drawVideoFunction`  
  // function we passed as a parameter.
  this.update = function() {
    var self = this
    var last = Date.now();
	
    var loop = function() {
      // For some effects, you might want to know how much time is passed
      // since the last frame; that's why we pass along a Delta time `deltaT`
      // variable (expressed in milliseconds)
	  // One possible (yet not tested) use is e.g. to reduce the frame rate in order to spare 
	  // processing power in a Raspberry Pi.
      var deltaT = Date.now - last;
      self.drawOnCanvas(self.video, deltaT, self.canvasContext);
	  // Force update of the Stage by telling it it's been damaged in best Smalltalk MVC style...
	  morphContext.changed();
	  // Update Delta T
      last = Date.now();
	  // Request video input for the next frame...
      requestAnimationFrame(loop);
	  // Let the developer know I'm running....
	  console.log("looping ..." + morphContext.webcam);
	  if (morphContext.webcam == 0) {
		if (request) {
			cancelAnimationFrame(request);
			console.log("Requested cancellation");
		}
		return;
	  }
    }
    var request = requestAnimationFrame(loop);
	console.log("loop was called once ...");

	//console.log("Width: " + this.canvasContext.canvas.width);
	//console.log("Height: " + this.canvasContext.canvas.height);
  } 
}

function videoOnCanvasError(e) {
	alert("VideoOnCanvas: No camera available...");
}

