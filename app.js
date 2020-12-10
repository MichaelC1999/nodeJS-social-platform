const express = require('express');
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const path = require('path')
const multer = require('multer');

const compression = require('compression')
const helmet = require('helmet')

//Package imports

const feedRoutes = require('./routes/feed')
const authRoutes = require('./routes/auth')

//Route imports

const app = express();

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString() + '-' + file.originalname)
    }
})

//Defining how to store files

const fileFilter = (req, file, cb) => {
    if(file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg'){
        cb(null, true)
    } else {
        cb(null, false)
    }
}

//Only permit files with these mime types

app.use(bodyParser.json())
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'))
app.use('/images', express.static(path.join(__dirname, 'images')))

//Configure the request with these options

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://feed-social-media-site.herokuapp.com')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    next();
})

//Configure the app to be a REST API, which a front end client can connect to and interact with

app.use('/feed', feedRoutes)
app.use('/auth', authRoutes)

//Connect to the respective route categories with each prefix

app.use(helmet())
app.use(compression())

app.use((error, req, res, next) => {
    console.log(error)
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({message: message, data: data})
})

//Handle errors and send them to the front end

mongoose
    .connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.ufyip.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?retryWrites=true&w=majority`)
    .then(result => {
        const server = app.listen(process.env.PORT || 5000);
        const io = require('./socket').init(server)
        io.on('connection', socket => {
            console.log('Client connected')
        })
    })
    .catch(err => console.log(err))

//Connect to DB using mongoose
//Use Socket to push a response to a client due to changes in data, with no prior request
