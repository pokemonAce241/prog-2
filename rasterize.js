/* GLOBAL CONSTANTS AND VARIABLES */



/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/ellipsoids.json"; // ellipsoids file loc
var Eye = new vec3.fromValues(0.5,0.5,-0.5); // default eye position in world space
var lookAt = new vec3.fromValues(0.5,0.5,1.0); // default look at position in world space
var lookUp = new vec3.fromValues(0.0,1.0,0.0); // default look upposition in world space

var lightCol = new vec3.fromValues(1,1,1);
var lightDir = new vec3.fromValues(-1,3,-0.5);

var proj = mat4.create();
var view = mat4.create();
var model = mat4.create();


/*input globals */
var inputTriangles; // the triangles read in from json
var inputEllipsoids; // the ellipsoids read in from json
var numTriangleSets = 0; // the number of sets of triangles
var triSetSizes = []; // the number of triangles in each set
var ellipsoidTriSetSizes = [];


/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffers = []; // this contains vertex coordinates in triples, organized by tri set
var triangleBuffers = []; // this contains indices into vertexBuffers in triples, organized by tri set
var triBufferSize = 0; // the number of indices in the triangle buffer
var normalBuffers = [];
var vertexPositionAttrib; // where to put position for vertex shader
var vertexNormalAttrib;

var ellipsoidVertexBuffer;
var ellipsoidIndexBuffer;
var ellipsoidNormalBuffer;
var coordArray = []; //ellipsoid vertex matrix
var normalArray = [];
var indexArray = []; //ellipsoid index matrix
var ellBufferSize = 0;
var latitude = 10;
var longitude = 10;
var radius = 1;

var viewMatLoc; // where to put the view matrix for vertex shader
var projMatLoc; // where to put the proj matrix for vertex shader
var modelMatrixULoc; // where to put the model matrix for vertex shader

		
//locations of lighting uniforms
var DiffuseRLoc; // where to put the red Diffuse attribute for fragment shader
var DiffuseGLoc; // where to put the Green Diffuse attribute for fragment shader
var DiffuseBLoc; // where to put the Blue Diffuse attribute for fragment shader

var SpecularRLoc; // where to put the red Specular attribute for fragment shader
var SpecularGLoc; // where to put the Green Specular attribute for fragment shader
var SpecularBLoc; // where to put the Blue Specular attribute for fragment shader

var AmbientRLoc; // where to put the red Ambient attribute for fragment shader
var AmbientGLoc; // where to put the Green Ambient attribute for fragment shader
var AmbientBLoc; // where to put the Blue Ambient attribute for fragment shader

var ShininessLoc;// where to put shine intensity for fragment shader


var LightDirLoc;
var EyeLoc;



// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    

    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get json file

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try

    catch(e) {
      console.log(e);
    } // end catch

} // end setupWebGL

// read triangles in, load them into webgl buffers
function loadTriangles() {
    inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");

    if (inputTriangles != String.null) { 
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var vtxToAdd; // vtx coords to add to the coord array
        var triToAdd; // tri indices to add to the index array

        // for each set of tris in the input file
        numTriangleSets = inputTriangles.length;
        for (var whichSet=0; whichSet<numTriangleSets; whichSet++) {
            
            // set up the vertex coord array
            inputTriangles[whichSet].coordArray = []; // create a list of coords for this tri set
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                inputTriangles[whichSet].coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
            } // end for vertices in set

            // send the vertex coords to webGL
            vertexBuffers[whichSet] = gl.createBuffer(); // init empty vertex coord buffer for current set
            gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichSet]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].coordArray),gl.STATIC_DRAW); // coords to that buffer
            
            // set up the triangle index array, adjusting indices across sets
            inputTriangles[whichSet].indexArray = []; // create a list of tri indices for this tri set
            triSetSizes[whichSet] = inputTriangles[whichSet].triangles.length;
            for (whichSetTri=0; whichSetTri<triSetSizes[whichSet]; whichSetTri++) {
                triToAdd = inputTriangles[whichSet].triangles[whichSetTri];
                inputTriangles[whichSet].indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            } // end for triangles in set

            // send the triangle indices to webGL
            triangleBuffers[whichSet] = gl.createBuffer(); // init empty triangle index buffer for current tri set
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichSet]); // activate that buffer
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(inputTriangles[whichSet].indexArray),gl.STATIC_DRAW); // indices to that buffer
        
		//set up the triangle normal array
           inputTriangles[whichSet].normalArray = []; // create a list of tri normals for this tri set
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].normals.length; whichSetVert++) {
                vtxToAdd = inputTriangles[whichSet].normals[whichSetVert];
               inputTriangles[whichSet].normalArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
            } // end for vertices in set
	    
	    // send the normal coords to webGL
            normalBuffers[whichSet] = gl.createBuffer(); // init empty vertex coord buffer for current set
            gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[whichSet]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].normalArray),gl.STATIC_DRAW); // coords to that buffer
		
		} // end for each triangle set 
	    
	    
	    
	    
	    
} // end if triangles found
} // end load triangles

function loadEllipsoids(){
 inputEllipsoids = getJSONFile(INPUT_SPHERES_URL,"ellipsoids");

    if (inputEllipsoids != String.null) {
	
	for(var latNumber = 0; latNumber <= latitude; latNumber++){
		var theta = latNumber*Math.PI/latitude;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);
		
		for(var longNumber = 0; longNumber <= longitude; longNumber++){
			var phi = longNumber*2*Math.PI/longitude;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);
			
			var z = cosPhi*sinTheta;
			var y = cosTheta;
			var x = sinPhi*sinTheta;
			
			normalArray.push(x);
			normalArray.push(y);
			normalArray.push(z);
			coordArray.push(radius*x);
			coordArray.push(radius*y);
			coordArray.push(radius*z);
		}
		
		
	}
	
	for(var latNumber = 0; latNumber < latitude; latNumber++){
		for(var longNumber = 0; longNumber < longitude; longNumber++){
		  var first =(latNumber*(longitude+1))+longNumber;
		  var second = first+longitude+1;
		  indexArray.push(first);
		  indexArray.push(second);
		  indexArray.push(first+1);
		  
		  indexArray.push(second);
		  indexArray.push(second+1);
		  indexArray.push(first+1);
		  
		
		}
	
	}
	
	// send the vertex coords to webGL
        ellipsoidVertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidVertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer
        ellipsoidVertexBuffer.itemSize = 3;
	ellipsoidVertexBuffer.numItem = coordArray.length/3;
	    
        // send the triangle indices to webGL
        ellipsoidIndexBuffer = gl.createBuffer(); // init empty ellipsoid index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ellipsoidIndexBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer
	ellipsoidIndexBuffer.itemSize = 1;
	ellipsoidIndexBuffer.numItems = indexArray.length;
	    
	//send the normal coords to webGl
	ellipsoidNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidNormalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normalArray),gl.STATIC_DRAW);
	ellipsoidNormalBuffer.itemSize = 3;
	ellipsoidNormalBuffer.numItem = normalArray.length/3;
	    
	
}
}



// setup the webGL shaders

function setupShaders() {

    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
	precision mediump float;
	uniform float diffuseR;
	uniform float diffuseG;
	uniform float diffuseB;
	uniform float ambientR;
	uniform float ambientG;
	uniform float ambientB;
	uniform float specularR;
	uniform float specularG;
	uniform float specularB;
	uniform float shininess;
	uniform vec3 eyeSource;
	uniform vec3 lightSource;
	varying vec3 worldPosition;
	varying vec3 worldNormal;
        void main(void) {
	
	 vec3 L = normalize(lightSource-worldPosition);
	 vec3 V = normalize(eyeSource-worldPosition);
	float LdotN = dot(L,worldNormal);
        float ambientRed = ambientR;
	float diffuseRed = diffuseR*LdotN;
	float specularRed = 0.0;
	float ambientGreen = ambientG;
	float diffuseGreen = diffuseG*LdotN;
	float specularGreen = 0.0;
	float ambientBlue = ambientB;
	float diffuseBlue = diffuseB*LdotN;
	float specularBlue = 0.0;
	if(LdotN > 0.0)
{
vec3 H = normalize(L+V);
specularRed = specularR*pow(dot(H,worldNormal),shininess);
specularGreen = specularG*pow(dot(H,worldNormal),shininess);
specularBlue = specularB*pow(dot(H,worldNormal),shininess);
//vec3 R = -normalize(reflect(L,worldNormal));
//specularRed = specularR*pow(dot(R,worldNormal),shininess);
//specularGreen = specularG*pow(dot(R,worldNormal),shininess);
//specularBlue = specularB*pow(dot(R,worldNormal),shininess);
}
 float colorR = ambientRed+diffuseRed+specularRed;
 float colorG = ambientGreen+diffuseGreen+specularGreen;
 float colorB = ambientBlue+diffuseBlue+specularBlue;
            gl_FragColor = vec4(ambientRed, ambientGreen, ambientBlue, 1.0); 
        }
    `;

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 vertexPosition;
	attribute vec3 normalPosition;
	uniform mat4 viewMat;
	uniform mat4 projMat;
	uniform mat4 modelMat;
	varying vec3 worldPosition;
	varying vec3 worldNormal;
	
        void main(void) {
            worldPosition = mat3(modelMat)*vertexPosition;
	    worldNormal = normalize(mat3(modelMat)*normalPosition);
            gl_Position = projMat*viewMat*modelMat*vec4(vertexPosition, 1.0); // use the untransformed position
        }
    `;

    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution            

        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                vertexPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vertexPosition"); 
		vertexNormalAttrib = // get pointer to normal shader input
                    gl.getAttribLocation(shaderProgram, "normalPosition");
		
		viewMatLoc = gl.getUniformLocation(shaderProgram,"viewMat");
		projMatLoc = gl.getUniformLocation(shaderProgram,"projMat");
		modelMatrixULoc = gl.getUniformLocation(shaderProgram,"modelMat");
		
		

		DiffuseRLoc = gl.getUniformLocation(shaderProgram,"diffuseR");
		DiffuseGLoc = gl.getUniformLocation(shaderProgram,"diffuseG");
		DiffuseBLoc = gl.getUniformLocation(shaderProgram,"diffuseB");
		    
		AmbientRLoc = gl.getUniformLocation(shaderProgram,"ambientR");
		AmbientGLoc = gl.getUniformLocation(shaderProgram,"ambientG");
		AmbientBLoc = gl.getUniformLocation(shaderProgram,"ambientB");
		    
		SpecularRLoc = gl.getUniformLocation(shaderProgram,"specularR");
		SpecularGLoc = gl.getUniformLocation(shaderProgram,"specularG");
		SpecularBLoc = gl.getUniformLocation(shaderProgram,"specularB");
		    
		ShininessLoc = gl.getUniformLocation(shaderProgram,"shininess");
		LightDirLoc = gl.getUniformLocation(shaderProgram,"lightSource");
                EyeLoc = gl.getUniformLocation(shaderProgram,"eyeSource");
		
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array
		gl.enableVertexAttribArray(vertexNormalAttrib);

            } // end if no shader program link errors

        } // end if no compile errors

    } // end try 

    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

// render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
	mat4.lookAt(view,Eye,lookAt,lookUp);
	mat4.perspective(proj,45,gl.viewportWidth/gl.viewportHeight,0.1,100.0);
	mat4.identity(model);
	var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");
 for(var whichTriSet=0; whichTriSet<inputTriangles.length; whichTriSet++) {
	 
	//pass view and proj matrix to shader
	gl.uniformMatrix4fv(viewMatLoc,false,view);
	gl.uniformMatrix4fv(projMatLoc,false,proj);
	gl.uniformMatrix4fv(modelMatrixULoc,false,model);
	
	
	//passes lighting parameters to fragment shader
	gl.uniform1f(DiffuseRLoc,inputTriangles[whichTriSet].material.diffuse[0]);
	gl.uniform1f(DiffuseGLoc,inputTriangles[whichTriSet].material.diffuse[1]);
	gl.uniform1f(DiffuseBLoc,inputTriangles[whichTriSet].material.diffuse[2]);
	 
	 gl.uniform1f(DiffuseRLoc,inputTriangles[whichTriSet].material.diffuse[0]);
	gl.uniform1f(DiffuseGLoc,inputTriangles[whichTriSet].material.diffuse[1]);
	gl.uniform1f(DiffuseBLoc,inputTriangles[whichTriSet].material.diffuse[2]);
	
	gl.uniform1f(AmbientRLoc,inputTriangles[whichTriSet].material.ambient[0]);
	gl.uniform1f(AmbientGLoc,inputTriangles[whichTriSet].material.ambient[1]);
	gl.uniform1f(AmbientBLoc,inputTriangles[whichTriSet].material.ambient[2]);
	
	gl.uniform1f(SpecularRLoc,inputTriangles[whichTriSet].material.specular[0]);
	gl.uniform1f(SpecularGLoc,inputTriangles[whichTriSet].material.specular[1]);
	gl.uniform1f(SpecularBLoc,inputTriangles[whichTriSet].material.specular[2]);
	
	gl.uniform1f(ShininessLoc,inputTriangles[whichTriSet].material.n);
	gl.uniform3fv(LightDirLoc,Eye);
	gl.uniform3fv(EyeLoc,lightDir);
	 
	 // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichTriSet]); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed
	 
    gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[whichTriSet]);
    gl.vertexAttribPointer(vertexNormalAttrib,3,gl.FLOAT,false,0,0);

    // triangle buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[whichTriSet]); // activate
    gl.drawElements(gl.TRIANGLES,3*triSetSizes[whichTriSet],gl.UNSIGNED_SHORT,0); // render
}
} // end render triangles

function renderEllipsoids(){


for( var whichSet = 0; whichSet<inputEllipsoids.length;whichSet++){
mat4.identity(model);
var setCenter = vec3.fromValues(.25,.75,0);
var trans = new vec3.fromValues(inputEllipsoids[whichSet].x,inputEllipsoids[whichSet].y,inputEllipsoids[whichSet].z);
var size = new vec3.fromValues(inputEllipsoids[whichSet].a,inputEllipsoids[whichSet].b,inputEllipsoids[whichSet].c); 
mat4.translate(model,model,trans);
mat4.scale(model,model,size);	

gl.uniformMatrix4fv(viewMatLoc,false,view);
gl.uniformMatrix4fv(projMatLoc,false,proj);
gl.uniformMatrix4fv(modelMatrixULoc,false,model);	
	
//passes lighting parameters to fragment shader
	gl.uniform1f(DiffuseRLoc,inputEllipsoids[whichSet].diffuse[0]);
	gl.uniform1f(DiffuseGLoc,inputEllipsoids[whichSet].diffuse[1]);
	gl.uniform1f(DiffuseBLoc,inputEllipsoids[whichSet].diffuse[2]);
	
	gl.uniform1f(AmbientRLoc,inputEllipsoids[whichSet].ambient[0]);
	gl.uniform1f(AmbientGLoc,inputEllipsoids[whichSet].ambient[1]);
	gl.uniform1f(AmbientBLoc,inputEllipsoids[whichSet].ambient[2]);
	
	gl.uniform1f(SpecularRLoc,inputEllipsoids[whichSet].specular[0]);
	gl.uniform1f(SpecularGLoc,inputEllipsoids[whichSet].specular[1]);
	gl.uniform1f(SpecularBLoc,inputEllipsoids[whichSet].specular[2]);
	
	gl.uniform1f(ShininessLoc,inputEllipsoids[whichSet].n);
	gl.uniform3fv(LightDirLoc,Eye);
	gl.uniform3fv(EyeLoc,lightDir);
	
	


//vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidVertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,ellipsoidVertexBuffer.itemSize,gl.FLOAT,false,0,0); // feed
	
    gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidNormalBuffer);
    gl.vertexAttribPointer(vertexNormalAttrib,ellipsoidNormalBuffer.itemSize,gl.FLOAT,false,0,0);


    // index buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ellipsoidIndexBuffer); // activate
    gl.drawElements(gl.TRIANGLES,ellipsoidIndexBuffer.numItems,gl.UNSIGNED_SHORT,0); // render

}


}





/* MAIN -- HERE is where execution begins after window load */



function main() {

  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  loadEllipsoids();
  setupShaders(); // setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL
  renderEllipsoids();

  

} // end main
