// filepath: c:\Users\anton\Desktop\Curso-midu-6\server\serve.js
import express from 'express'; // Importa el módulo express
import http from 'http'; // Importa el módulo http de Node.js
import { Server } from 'socket.io'; // Importa el módulo socket.io
import path from 'path'; // Importa el módulo path de Node.js para manejar rutas de archivos
import { fileURLToPath } from 'url'; // Lo utiliza para poder usar _dirname 
import { createClient } from '@libsql/client'; // Importa el módulo @libsql/client para manejar la base de datos SQLite
import dotenv from 'dotenv'; // Importa el módulo dotenv

// Cargar variables de entorno desde el archivo .env
dotenv.config();

// Obtener __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express(); // Crea una instancia de la aplicación express
const server = http.createServer(app); // Crea un servidor HTTP usando la aplicación express
const io = new Server(server); // Crea una instancia de Socket.IO y la asocia con el servidor HTTP

const PORT = process.env.PORT ?? 1234; // Define el puerto en el que el servidor escuchará, usando el puerto de la variable de entorno o 1234 por defecto

// Conectar a la base de datos SQLite
const db = createClient({
    url: "libsql://hila-hilachos.turso.io",
    authToken: process.env.AUTH_TOKEN // Usa el authToken desde las variables de entorno
});


// Crear la tabla de mensajes si no existe
await db.execute(`
  CREATE TABLE IF NOT EXISTS mensajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    texto TEXT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Servir archivos estáticos (tu archivo HTML, CSS, etc.)
app.use(express.static(path.join(__dirname, '../public'))); // Configura la aplicación para servir archivos estáticos desde la carpeta 'public'

// Maneja la conexión de un cliente
io.on('connection', async (socket) => {
  console.log('a user connected'); // Imprime un mensaje en la consola cuando un usuario se conecta

  // Enviar todos los mensajes anteriores al nuevo cliente
  const mensajes = await db.execute('SELECT * FROM mensajes ORDER BY fecha ASC');
  socket.emit('previous messages', mensajes.rows);

  // Maneja el evento 'chat message' enviado por el cliente
  socket.on('chat message', async (msg) => {
    await db.execute('INSERT INTO mensajes (texto) VALUES (?)', [msg]);
    const mensaje = await db.execute('SELECT * FROM mensajes ORDER BY id DESC LIMIT 1');
    io.emit('chat message', mensaje.rows[0]); // Reenvía el mensaje a todos los clientes conectados
  });

  // Maneja la desconexión de un cliente
  socket.on('disconnect', () => {
    console.log('user disconnected'); // Imprime un mensaje en la consola cuando un usuario se desconecta
  });
});

// Inicia el servidor y escucha en el puerto definido
server.listen(PORT, () => {
  console.log(`server listening on port http://localhost:${PORT}`); // Imprime un mensaje en la consola cuando el servidor está listo
});
