const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//build a schema that defines the form and the values of how a user should be created and stored in the database

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'I am new!'
    },
    posts: [{
        type: Schema.Types.ObjectId,
        ref: 'Post'
    }]
})

module.exports = mongoose.model('User', userSchema)

//Refers to 'User' collection in the database, should be in the form of the user Schema