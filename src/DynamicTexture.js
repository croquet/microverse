// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

// DynamicTexture is used to define and interact with an offscreen canvas that updates a texture object. In particular,
// it is used as the text editing object.
// Despite its name, it isn't a TObject.
import { THREE } from '@croquet/worldcore-three';

export class DynamicTexture{
  //'initialize',{
    // width and height are in pixels, to be used to create the canvas
    // width, height, options.fillStyle, options.clearStyle
    constructor(width, height, fillStyle, clearStyle){
        if (width>2048 || height>2048) console.warn("large texture: "+width+"x"+height); // @@ DEBUG
        var nearestPowerOfTwo = value=>2**(Math.round( Math.log( value ) / Math.LN2 ) );

        var twoWidth = nearestPowerOfTwo(width), twoHeight = nearestPowerOfTwo(height);
        var needsAdjustment = twoWidth!==width || twoHeight!==height; // || (canvas && (twoWidth!==canvas.width || twoHeight!==canvas.height));
        if (needsAdjustment) console.log("TDynamicTexture: " + width + "x" + height + " becomes " + twoWidth + "x" + twoHeight);

        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width = twoWidth;
        this.canvas.height = this.height = twoHeight;

        this.context = this.canvas.getContext("2d");
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.extractMipmapLevel = 3;

        this.fontName = 'Arial';
        this.fontHeight = 32;
        this.fillStyle = fillStyle || 'black';
        this.clearStyle = clearStyle;
        this.setFont("normal 32px Arial"); // default
        this.align = 'left';
        this.scale = 1;
    }

//  'interface',{
    asMaterial(){
        return new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 1,
            emissive: 0x333333,
            map: this.texture,
            transparent: false,
        });
    }

    getTexture(){return this.texture}

    getMiniTexture(){
        if (this.miniTexture) return this.miniTexture;

        let texture = this.texture;
        let level = this.extractMipmapLevel, multiple = 2**level;
        let miniWidth = this.width/multiple, miniHeight = this.height/multiple;

        let renderer = this.service("ThreeRenderManager").renderer,
            gl = renderer.getContext(),
            glTexture = gl.createTexture();

        // following https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
        const loadLevel = 0;
        const internalFormat = gl.RGBA;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;

        gl.bindTexture(gl.TEXTURE_2D, glTexture);

        let utils = THREE.WebGLUtils(gl);
        // these lines from uploadTexture() in three.js; we might need more (e.g., anisotropy)
        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, texture.flipY );
        gl.pixelStorei( gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha );
        gl.pixelStorei( gl.UNPACK_ALIGNMENT, texture.unpackAlignment );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, utils.convert( texture.wrapS ) );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, utils.convert( texture.wrapT ) );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, utils.convert( texture.magFilter ) );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, utils.convert( texture.minFilter ) );

        // note: we might be able to do this more efficiently; see discussion of texStorage2D
        // in "Creating a complete texture" in https://www.khronos.org/opengl/wiki/Common_Mistakes
        gl.texImage2D(gl.TEXTURE_2D, loadLevel, internalFormat, srcFormat, srcType, this.canvas);
        gl.generateMipmap(gl.TEXTURE_2D);

        // Create a framebuffer backed by the desired level of the texture
        let framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        // NB: following (with non-zero level parameter) requires webgl2
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glTexture, level);
        let data;
        let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER), ok = status===gl.FRAMEBUFFER_COMPLETE;
        if (ok) {
            // Read the contents of the framebuffer
            data = new Uint8Array(miniWidth * miniHeight * 4);
            gl.readPixels(0, 0, miniWidth, miniHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);
        } else console.log("frame buffer not ready; status="+status);
        gl.deleteFramebuffer(framebuffer);
        gl.deleteTexture(glTexture);
        if (!ok) return null; // better luck next time

        // Create a mini canvas to store the result
        let miniCanvas = document.createElement("canvas"), context = miniCanvas.getContext("2d");
        miniCanvas.width = miniWidth;
        miniCanvas.height = miniHeight;

        // Copy the pixels to the mini canvas
        let imageData = context.createImageData(miniWidth, miniHeight);
        imageData.data.set(data);
        context.putImageData(imageData, 0, 0);

        this.miniTexture = new THREE.CanvasTexture(miniCanvas);
        this.miniTexture.flipY = false;
        return this.miniTexture;
    }

    discardMiniTexture() { delete this.miniTexture; }

    // parsing the font spec seems to be pretty heavy - so if we're using the same font
    // many times, we don't want to keep re-assigning this.context.font.
    // however... because the context's font setting is lost during a restore(), for example
    // as used to remove the clip() setting after drawing a cell region of a TDataTable texture,
    // in such cases we'll only end up skipping repeated font setting if the texture's default
    // font (set as this.font) is also the font used for the cells.
    setFont(font){ this.context.font = this.font = this.lastContextFont = font; }
    // called internally, so we can skip the setting if it's the same as last time
    setContextFont(font) {
        if (font!==this.lastContextFont) this.context.font = this.lastContextFont = font;
    }

    setFillStyle(fillStyle){this.fillStyle = fillStyle;}

    setAlign(align){this.align = align;}

    doWithClip(x, y, width, height, fn){
        let context = this.context;
        context.save();
        context.beginPath();
        context.rect(x,y,width,height);
        context.clip();

        fn();

        context.restore();
        this.lastContextFont = this.font; // @@ assume (somewhat riskily) that we're returning to the base state
    }

    fill(fillStyle){
        this.context.save();
        this.context.scale(1/this.scale, 1/this.scale);
        this.fillRect(0, 0, this.canvas.width, this.canvas.height, fillStyle);
        this.context.restore();
    }

    clear(){
        this.context.save();
        this.context.scale(1/this.scale, 1/this.scale);
        this.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.texture.needsUpdate = true;
        this.context.restore();
    }

    fillRect(x, y, width, height, fillStyle){
        this.context.fillStyle = fillStyle || this.fillStyle;
        this.context.fillRect(x, y, width, height);
        this.texture.needsUpdate = true;
    }

    clearRect(x, y, width, height){
        if( this.clearStyle !== undefined ){
            this.context.fillStyle = this.clearStyle;
            this.context.fillRect(x, y, width, height);
        }else{
            this.context.clearRect(x, y, width, height);
        }
        this.texture.needsUpdate = true;
    }

    drawImage(...args){
        // execute the drawImage on the internal context
        // the arguments are the same the official context2d.drawImage so we just pass it through
        this.context.drawImage(...args);
        this.texture.needsUpdate = true;
    }

    drawText(text, x, y, fillStyle, contextFont, suppressShadow){
        function isNumber(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        }
        if(!isNumber(x)) return this.drawTextCentered(text, y, fillStyle, contextFont, suppressShadow);
        this.setContextFont(contextFont||this.font);
        let context = this.context;
        context.textAlign = this.align;

        // draw a black version to sharpen the text's outline
        // ael: add suppressShadow argument to allow caller to disable this
        if (!suppressShadow) {
            context.fillStyle = 'black';
            context.fillText(text, x+1, y+1);
        }
        context.fillStyle = fillStyle||this.fillStyle;
        context.fillText(text, x, y);
        this.texture.needsUpdate = true;
    }

    drawTextCentered(text, y, fillStyle, contextFont, suppressShadow){
        this.setContextFont(contextFont||this.font);
        var w = this.context.measureText(text).width;
        var h = this.fontHeight;
        var x = (this.canvas.width-w)/2;
        if (typeof y!=="number") y = (this.canvas.height+h)/2 -2;
        if (!suppressShadow) {
            this.context.fillStyle = 'black';
            this.context.fillText(text, x+1, y+1);
        }
        this.context.fillStyle = fillStyle||this.fillStyle;
        this.context.fillText(text, x, y);
        this.texture.needsUpdate = true;
    }

    drawTextRight(text, y, fillStyle, contextFont, suppressShadow){
        this.setContextFont(contextFont||this.font);
        var w = this.context.measureText(text).width+2;
        var h = this.fontHeight;
        var x = this.canvas.width-w;
        if (typeof y!=="number") y = (this.canvas.height+h)/2 -2;
        if (!suppressShadow) {
            this.context.fillStyle = 'black';
            this.context.fillText(text, x+1, y+1);
        }
        this.context.fillStyle = fillStyle||this.fillStyle;
        this.context.fillText(text, x, y);
        this.texture.needsUpdate = true;
    }

    drawTextLeft(text, y, fillStyle, contextFont){
        this.setContextFont(contextFont||this.font);
        //var w = this.context.measureText(text).width+2;
        var h = this.fontHeight;
        var x = 2, y = y || (this.canvas.height+h)/2 -2;
        this.context.fillStyle = 'black';
        this.context.fillText(text, x+1, y+1);
        this.context.fillStyle = fillStyle||this.fillStyle;
        this.context.fillText(text, x, y);
        this.texture.needsUpdate = true;
    }

    drawRect(x, y, width, height, style, lineWidth){
        // Green rectangle
        this.context.beginPath();
        this.context.lineWidth=lineWidth||"4";
        this.context.strokeStyle= style||"green";
        this.context.rect(x,y,width,height);
        this.context.stroke();
        this.texture.needsUpdate = true;
    }

    drawLine(fromX,fromY, toX,toY, style, lineWidth){
        this.context.lineWidth=lineWidth||"1";
        this.context.strokeStyle= style||"white";
        this.context.beginPath();
        this.context.moveTo(fromX,fromY);
        this.context.lineTo(toX,toY);
        this.context.stroke();
        this.texture.needsUpdate = true;
    }

    // poly is an array with x,y,x,y,x,y,.. format
    drawPoly(poly, style, lineWidth){
        this.context.lineWidth=lineWidth||"1";
        this.context.strokeStyle= style||"white";
        this.context.beginPath();
        this.context.moveTo(poly[0], poly[1]);
        for(let i=2; i<poly.length; i+=2){
            this.context.lineTo(poly[i], poly[i+1]);
        }
        this.context.stroke();
        this.texture.needsUpdate = true;
    }

    // path is a Path2D object (SVG path)
    // let path = new Path2D('M 100,100 h 50 v 50 h 50');
    // dynamic.drawPath(path);
    drawPath( path ){
        this.context.stroke(path);
        this.texture.needsUpdate = true;
    }

    // image is an HTMLImageElement
    // let img = new Image();
    // img.src = "./assets/svg/CroquetSymbol_CMYK_NoShadow.svg";
    // dynamic.drawImage(10,10, img);
    drawImage(  image, x, y, width, height ){
        this.context.drawImage( image, x, y, width, height );
        this.texture.needsUpdate = true;
    }

    changed(){this.texture.needsUpdate = true; this.mipmapTexture.dispose(); this.mipmapTexture = null;}

    setScale(scale){this.scale = scale; this.context.scale(scale, scale);}
}
