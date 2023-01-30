import { config } from 'dotenv';
import express from 'express';
import session from 'express-session';
import router from './router.js';

//Configuring DotEnv
config()

const sessionParser = session({
    secret: process.env.SESSION_SECRET, 
    saveUninitialized: true, 
    resave: true,
    cookie:{
        expires: 86400*1000,
        maxAge: 86400*1000
    }
});
const app = express()
app.use(sessionParser)
app.use(express.json())

// Add headers
app.use((req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.status(200);
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', true);
    next();
  });

//Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send('Something broke!')  
})
//Handle Routes
app.use('/', router);

const server = app.listen(process.env.SERVER_PORT);
