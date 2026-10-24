var val = require('../libs/unalib');
var assert = require('assert');


describe('unalib', function(){


  describe('funcion is_valid_phone', function(){

    it('deberia devolver true para 8297-8547', function(){
      assert.equal(val.is_valid_phone('8297-8547'), false);
    });

    it('deberia devolver false para 8297p-8547', function(){
      assert.equal(val.is_valid_phone('8297p-8547'), false);
    });

  });


  describe('funcion is_valid_url_image', function(){

    it('deberia devolver true para http://image.com/image.jpg', function(){
      assert.equal(val.is_valid_url_image('http://image.com/image.jpg'), true);
    });

    it('deberia devolver true para http://image.com/image.gif', function(){
      assert.equal(val.is_valid_url_image('http://image.com/image.gif'), true);
    });

    it('deberia devolver true para https://example.com/foto.png', function(){
      assert.equal(val.is_valid_url_image('https://example.com/foto.png'), true);
    });

    it('deberia devolver true para https://example.com/foto.jpeg', function(){
      assert.equal(val.is_valid_url_image('https://example.com/foto.jpeg'), true);
    });

    it('deberia devolver false para una URL sin extension de imagen', function(){
      assert.equal(val.is_valid_url_image('http://example.com/pagina'), false);
    });

    it('deberia devolver false para una URL con extension .exe', function(){
      assert.equal(val.is_valid_url_image('http://example.com/archivo.exe'), false);
    });

    it('deberia devolver false para texto que no es URL', function(){
      assert.equal(val.is_valid_url_image('esto no es una url'), false);
    });

  });


  describe('funcion is_valid_yt_video', function(){

    it('deberia devolver true para URL de YouTube con watch', function(){
      assert.equal(val.is_valid_yt_video('https://www.youtube.com/watch?v=qYwlqx-JLok'), true);
    });

    it('deberia devolver true para URL corta youtu.be', function(){
      assert.equal(val.is_valid_yt_video('https://youtu.be/dQw4w9WgXcQ'), true);
    });

    it('deberia devolver true para URL de YouTube embed', function(){
      assert.equal(val.is_valid_yt_video('https://www.youtube.com/embed/dQw4w9WgXcQ'), true);
    });

    it('deberia devolver false para URL de Vimeo', function(){
      assert.equal(val.is_valid_yt_video('https://vimeo.com/12345'), false);
    });

    it('deberia devolver false para texto que no es URL', function(){
      assert.equal(val.is_valid_yt_video('esto no es un video'), false);
    });

  });


  describe('funcion validateMessage - prevencion de XSS', function(){

    it('deberia eliminar etiquetas <script> del mensaje', function(){
      var input = JSON.stringify({ nombre: 'Test', mensaje: '<script>alert("xss")</script>', color: '#000' });
      var result = val.validateMessage(input);
      var parsed = JSON.parse(result);
      assert.equal(parsed.mensaje.includes('<script>'), false);
    });

    it('deberia eliminar atributos onerror del mensaje', function(){
      var input = JSON.stringify({ nombre: 'Test', mensaje: '<img onerror="alert(1)" src="x">', color: '#000' });
      var result = val.validateMessage(input);
      var parsed = JSON.parse(result);
      assert.equal(parsed.mensaje.includes('onerror'), false);
    });

    it('deberia eliminar javascript: del mensaje', function(){
      var input = JSON.stringify({ nombre: 'Test', mensaje: 'javascript:alert(1)', color: '#000' });
      var result = val.validateMessage(input);
      var parsed = JSON.parse(result);
      assert.equal(parsed.mensaje.includes('javascript:'), false);
    });

    it('deberia sanitizar el nombre tambien', function(){
      var input = JSON.stringify({ nombre: '<script>alert("xss")</script>', mensaje: 'hola', color: '#000' });
      var result = val.validateMessage(input);
      var parsed = JSON.parse(result);
      assert.equal(parsed.nombre.includes('<script>'), false);
    });

    it('deberia permitir texto normal sin modificarlo', function(){
      var input = JSON.stringify({ nombre: 'Juan', mensaje: 'Hola mundo', color: '#FFF' });
      var result = val.validateMessage(input);
      var parsed = JSON.parse(result);
      assert.equal(parsed.mensaje, 'Hola mundo');
    });

    it('deberia convertir URL de imagen valida a etiqueta img', function(){
      var input = JSON.stringify({ nombre: 'Test', mensaje: 'https://example.com/foto.jpg', color: '#000' });
      var result = val.validateMessage(input);
      var parsed = JSON.parse(result);
      assert.equal(parsed.mensaje.includes('<img src='), true);
    });

    it('deberia convertir URL de YouTube a iframe', function(){
      var input = JSON.stringify({ nombre: 'Test', mensaje: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', color: '#000' });
      var result = val.validateMessage(input);
      var parsed = JSON.parse(result);
      assert.equal(parsed.mensaje.includes('youtube.com/embed'), true);
    });

  });


});
