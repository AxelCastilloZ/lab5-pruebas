const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const validation = require('../../libs/unalib');
const express = require('express');

describe('Pruebas de integracion - Chat UNA', () => {
  let io, serverSocket, clientSocket, httpServer;

  beforeAll((done) => {
    const app = express();
    httpServer = createServer(app);
    io = new Server(httpServer);

    io.on('connection', (socket) => {
      serverSocket = socket;
      socket.on('Evento-Mensaje-Server', (msg) => {
        msg = validation.validateMessage(msg);
        io.emit('Evento-Mensaje-Server', msg);
      });
    });

    httpServer.listen(0, () => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    if (clientSocket) clientSocket.disconnect();
    if (io) io.close();
    return new Promise((resolve) => {
      if (httpServer) httpServer.close(resolve);
      else resolve();
    });
  });

  test('debe aceptar y retransmitir una URL de imagen valida', (done) => {
    const msg = JSON.stringify({
      nombre: 'Usuario',
      mensaje: 'https://example.com/foto.jpg',
      color: '#FF0000'
    });

    clientSocket.on('Evento-Mensaje-Server', function handler(data) {
      clientSocket.off('Evento-Mensaje-Server', handler);
      const parsed = JSON.parse(data);
      expect(parsed.mensaje).toContain('<img src=');
      expect(parsed.mensaje).toContain('foto.jpg');
      done();
    });

    clientSocket.emit('Evento-Mensaje-Server', msg);
  });

  test('debe aceptar y retransmitir una URL de video de YouTube', (done) => {
    const msg = JSON.stringify({
      nombre: 'Usuario',
      mensaje: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      color: '#00FF00'
    });

    clientSocket.on('Evento-Mensaje-Server', function handler(data) {
      clientSocket.off('Evento-Mensaje-Server', handler);
      const parsed = JSON.parse(data);
      expect(parsed.mensaje).toContain('youtube.com/embed');
      expect(parsed.mensaje).toContain('dQw4w9WgXcQ');
      done();
    });

    clientSocket.emit('Evento-Mensaje-Server', msg);
  });

  test('debe sanitizar un mensaje con script malicioso', (done) => {
    const msg = JSON.stringify({
      nombre: 'Atacante',
      mensaje: '<script>alert("xss")</script>',
      color: '#0000FF'
    });

    clientSocket.on('Evento-Mensaje-Server', function handler(data) {
      clientSocket.off('Evento-Mensaje-Server', handler);
      const parsed = JSON.parse(data);
      expect(parsed.mensaje).not.toContain('<script>');
      expect(parsed.mensaje).not.toContain('alert');
      done();
    });

    clientSocket.emit('Evento-Mensaje-Server', msg);
  });

  test('debe sanitizar el nombre si contiene script', (done) => {
    const msg = JSON.stringify({
      nombre: '<script>alert("xss")</script>',
      mensaje: 'mensaje normal',
      color: '#000000'
    });

    clientSocket.on('Evento-Mensaje-Server', function handler(data) {
      clientSocket.off('Evento-Mensaje-Server', handler);
      const parsed = JSON.parse(data);
      expect(parsed.nombre).not.toContain('<script>');
      expect(parsed.mensaje).toBe('mensaje normal');
      done();
    });

    clientSocket.emit('Evento-Mensaje-Server', msg);
  });

});
